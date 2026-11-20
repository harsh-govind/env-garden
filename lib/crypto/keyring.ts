import { entropyToMnemonic, mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import {
    ACCOUNT_BOX_SUBKEY_ID,
    ACCOUNT_KDF_CONTEXT,
    ACCOUNT_SEED_BYTE_LENGTH,
    ACCOUNT_SIGN_SUBKEY_ID,
    CRYPTO_DOMAIN,
    CRYPTO_KEY_BYTE_LENGTH,
    DEFAULT_PASSPHRASE_KDF_PARAMS,
    FINGERPRINT_BYTE_LENGTH,
    MAX_PASSPHRASE_KDF_MEM_LIMIT_BYTES,
    MAX_PASSPHRASE_KDF_OPS_LIMIT,
    MIN_PASSPHRASE_KDF_MEM_LIMIT_BYTES,
    MIN_PASSPHRASE_KDF_OPS_LIMIT,
    PASSPHRASE_SALT_BYTE_LENGTH,
    VAULT_PASSPHRASE_MAX_LENGTH,
    VAULT_PASSPHRASE_MIN_LENGTH,
} from "@/constants/crypto";
import { aeadDecrypt, aeadEncrypt } from "@/lib/crypto/aead";
import {
    encodeFields,
    fromBase64,
    toBase64,
    utf8Encode,
    wipe,
} from "@/lib/crypto/encoding";
import { loadSodium, type Sodium } from "@/lib/crypto/sodium";
import type {
    AccountKeys,
    EncryptedKeyringPayload,
    PassphraseKdfParams,
    PublicAccountKeys,
} from "@/types/crypto";

function keyringAssociatedData(userId: string) {
    return encodeFields(CRYPTO_DOMAIN.keyring, [userId]);
}

function normalizePassphrase(passphrase: string) {
    return passphrase.normalize("NFKC");
}

export function validateVaultPassphrase(passphrase: string) {
    const normalized = normalizePassphrase(passphrase);

    if (normalized.length < VAULT_PASSPHRASE_MIN_LENGTH) {
        return `Use at least ${VAULT_PASSPHRASE_MIN_LENGTH} characters.`;
    }

    if (normalized.length > VAULT_PASSPHRASE_MAX_LENGTH) {
        return `Use at most ${VAULT_PASSPHRASE_MAX_LENGTH} characters.`;
    }

    if (new Set(normalized).size < 5) {
        return "Use a less repetitive passphrase.";
    }

    return null;
}

export function assertKdfParams(params: PassphraseKdfParams) {
    if (
        params.algorithm !== "argon2id13"
        || !Number.isInteger(params.opsLimit)
        || !Number.isInteger(params.memLimitBytes)
        || params.opsLimit < MIN_PASSPHRASE_KDF_OPS_LIMIT
        || params.opsLimit > MAX_PASSPHRASE_KDF_OPS_LIMIT
        || params.memLimitBytes < MIN_PASSPHRASE_KDF_MEM_LIMIT_BYTES
        || params.memLimitBytes > MAX_PASSPHRASE_KDF_MEM_LIMIT_BYTES
    ) {
        throw new Error("Unsupported key derivation parameters.");
    }
}

function deriveAccountKeysWith(sodium: Sodium, seed: Uint8Array): AccountKeys {
    if (seed.length !== ACCOUNT_SEED_BYTE_LENGTH) {
        throw new Error("Account seed must be 32 bytes.");
    }

    const signSeed = sodium.crypto_kdf_derive_from_key(
        CRYPTO_KEY_BYTE_LENGTH,
        ACCOUNT_SIGN_SUBKEY_ID,
        ACCOUNT_KDF_CONTEXT,
        seed
    );
    const boxSeed = sodium.crypto_kdf_derive_from_key(
        CRYPTO_KEY_BYTE_LENGTH,
        ACCOUNT_BOX_SUBKEY_ID,
        ACCOUNT_KDF_CONTEXT,
        seed
    );

    try {
        const signKeyPair = sodium.crypto_sign_seed_keypair(signSeed);
        const boxKeyPair = sodium.crypto_box_seed_keypair(boxSeed);

        return {
            seed: new Uint8Array(seed),
            signPublicKey: signKeyPair.publicKey,
            signSecretKey: signKeyPair.privateKey,
            boxPublicKey: boxKeyPair.publicKey,
            boxSecretKey: boxKeyPair.privateKey,
        };
    } finally {
        wipe(sodium, signSeed, boxSeed);
    }
}

export async function generateAccountKeys() {
    const sodium = await loadSodium();
    const seed = sodium.randombytes_buf(ACCOUNT_SEED_BYTE_LENGTH);

    try {
        return deriveAccountKeysWith(sodium, seed);
    } finally {
        wipe(sodium, seed);
    }
}

export async function deriveAccountKeys(seed: Uint8Array) {
    const sodium = await loadSodium();
    return deriveAccountKeysWith(sodium, seed);
}

export async function getPublicAccountKeys(keys: AccountKeys): Promise<PublicAccountKeys> {
    const sodium = await loadSodium();

    return {
        signPublicKey: toBase64(sodium, keys.signPublicKey),
        boxPublicKey: toBase64(sodium, keys.boxPublicKey),
    };
}

export async function wipeAccountKeys(keys: AccountKeys | null | undefined) {
    if (!keys) {
        return;
    }

    const sodium = await loadSodium();
    wipe(sodium, keys.seed, keys.signSecretKey, keys.boxSecretKey);
}

export function seedToRecoveryPhrase(seed: Uint8Array) {
    if (seed.length !== ACCOUNT_SEED_BYTE_LENGTH) {
        throw new Error("Account seed must be 32 bytes.");
    }

    return entropyToMnemonic(seed, wordlist);
}

export function normalizeRecoveryPhrase(phrase: string) {
    return phrase
        .normalize("NFKD")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .join(" ");
}

export function recoveryPhraseToSeed(phrase: string) {
    let seed: Uint8Array;

    try {
        seed = mnemonicToEntropy(normalizeRecoveryPhrase(phrase), wordlist);
    } catch {
        throw new Error("That recovery phrase is not valid. Check each word and the order.");
    }

    if (seed.length !== ACCOUNT_SEED_BYTE_LENGTH) {
        throw new Error("Recovery phrases have 24 words.");
    }

    return seed;
}

async function derivePassphraseKey(
    sodium: Sodium,
    passphrase: string,
    salt: Uint8Array,
    params: PassphraseKdfParams
) {
    assertKdfParams(params);

    return sodium.crypto_pwhash(
        CRYPTO_KEY_BYTE_LENGTH,
        utf8Encode(normalizePassphrase(passphrase)),
        salt,
        params.opsLimit,
        params.memLimitBytes,
        sodium.crypto_pwhash_ALG_ARGON2ID13
    );
}

export async function encryptKeyring(input: {
    userId: string;
    keys: AccountKeys;
    passphrase: string;
    kdfParams?: PassphraseKdfParams;
}): Promise<EncryptedKeyringPayload> {
    const passphraseError = validateVaultPassphrase(input.passphrase);

    if (passphraseError) {
        throw new Error(passphraseError);
    }

    const sodium = await loadSodium();
    const kdfParams = input.kdfParams ?? { ...DEFAULT_PASSPHRASE_KDF_PARAMS };
    const salt = sodium.randombytes_buf(PASSPHRASE_SALT_BYTE_LENGTH);
    const passphraseKey = await derivePassphraseKey(
        sodium,
        input.passphrase,
        salt,
        kdfParams
    );

    try {
        return {
            signPublicKey: toBase64(sodium, input.keys.signPublicKey),
            boxPublicKey: toBase64(sodium, input.keys.boxPublicKey),
            encryptedSeed: aeadEncrypt(
                sodium,
                input.keys.seed,
                passphraseKey,
                keyringAssociatedData(input.userId)
            ),
            kdfSalt: toBase64(sodium, salt),
            kdfParams,
        };
    } finally {
        wipe(sodium, passphraseKey);
    }
}

function assertKeysMatch(
    sodium: Sodium,
    keys: AccountKeys,
    expected: PublicAccountKeys
) {
    const signMatches = sodium.memcmp(
        keys.signPublicKey,
        fromBase64(sodium, expected.signPublicKey, sodium.crypto_sign_PUBLICKEYBYTES)
    );
    const boxMatches = sodium.memcmp(
        keys.boxPublicKey,
        fromBase64(sodium, expected.boxPublicKey, sodium.crypto_box_PUBLICKEYBYTES)
    );

    if (!signMatches || !boxMatches) {
        throw new Error("These keys do not belong to this account.");
    }
}

export async function decryptKeyring(input: {
    userId: string;
    keyring: EncryptedKeyringPayload;
    passphrase: string;
}) {
    const sodium = await loadSodium();
    const salt = fromBase64(sodium, input.keyring.kdfSalt, PASSPHRASE_SALT_BYTE_LENGTH);
    const passphraseKey = await derivePassphraseKey(
        sodium,
        input.passphrase,
        salt,
        input.keyring.kdfParams
    );
    let seed: Uint8Array | null = null;

    try {
        try {
            seed = aeadDecrypt(
                sodium,
                input.keyring.encryptedSeed,
                passphraseKey,
                keyringAssociatedData(input.userId)
            );
        } catch {
            throw new Error("Wrong passphrase.");
        }

        const keys = deriveAccountKeysWith(sodium, seed);
        assertKeysMatch(sodium, keys, input.keyring);
        return keys;
    } finally {
        wipe(sodium, passphraseKey, seed);
    }
}

export async function recoverAccountKeys(input: {
    recoveryPhrase: string;
    expected: PublicAccountKeys;
}) {
    const sodium = await loadSodium();
    const seed = recoveryPhraseToSeed(input.recoveryPhrase);

    try {
        const keys = deriveAccountKeysWith(sodium, seed);
        assertKeysMatch(sodium, keys, input.expected);
        return keys;
    } finally {
        wipe(sodium, seed);
    }
}

export async function computeFingerprint(keys: PublicAccountKeys) {
    const sodium = await loadSodium();
    const digest = sodium.crypto_generichash(
        FINGERPRINT_BYTE_LENGTH,
        encodeFields(CRYPTO_DOMAIN.fingerprint, [
            fromBase64(sodium, keys.signPublicKey, sodium.crypto_sign_PUBLICKEYBYTES),
            fromBase64(sodium, keys.boxPublicKey, sodium.crypto_box_PUBLICKEYBYTES),
        ]),
        null
    );
    const hex = sodium.to_hex(digest).toUpperCase();

    return hex.match(/.{4}/g)?.join(" ") ?? hex;
}
