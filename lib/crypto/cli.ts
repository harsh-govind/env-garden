import {
    CRYPTO_DOMAIN,
    CRYPTO_KEY_BYTE_LENGTH,
    VERIFICATION_CODE_ALPHABET,
    VERIFICATION_CODE_BYTE_LENGTH,
} from "@/constants/crypto";
import { aeadDecrypt, aeadEncrypt } from "@/lib/crypto/aead";
import {
    concatBytes,
    encodeFields,
    fromBase64,
    toBase64,
    wipe,
    xorBytes,
} from "@/lib/crypto/encoding";
import {
    deriveAccountKeys,
    getPublicAccountKeys,
    wipeAccountKeys,
} from "@/lib/crypto/keyring";
import { loadSodium } from "@/lib/crypto/sodium";
import type { AccountKeys, CliKeyShares, PublicAccountKeys } from "@/types/crypto";

function cliShareAssociatedData(tokenHash: string) {
    return encodeFields(CRYPTO_DOMAIN.cliShare, [tokenHash]);
}

export async function splitAccountKeyForCli(input: {
    keys: AccountKeys;
    tokenHash: string;
}): Promise<CliKeyShares> {
    const sodium = await loadSodium();
    const clientShare = sodium.randombytes_buf(CRYPTO_KEY_BYTE_LENGTH);
    const wrapKey = sodium.randombytes_buf(CRYPTO_KEY_BYTE_LENGTH);
    const serverShare = xorBytes(input.keys.seed, clientShare);

    try {
        return {
            clientShare,
            wrapKey,
            encryptedServerShare: aeadEncrypt(
                sodium,
                serverShare,
                wrapKey,
                cliShareAssociatedData(input.tokenHash)
            ),
        };
    } finally {
        wipe(sodium, serverShare);
    }
}

export async function combineCliAccountKey(input: {
    clientShare: Uint8Array;
    wrapKey: Uint8Array;
    encryptedServerShare: string;
    tokenHash: string;
    expected: PublicAccountKeys;
}) {
    const sodium = await loadSodium();
    const serverShare = aeadDecrypt(
        sodium,
        input.encryptedServerShare,
        input.wrapKey,
        cliShareAssociatedData(input.tokenHash)
    );
    const seed = xorBytes(serverShare, input.clientShare);
    wipe(sodium, serverShare);

    try {
        const keys = await deriveAccountKeys(seed);
        const publicKeys = await getPublicAccountKeys(keys);

        if (
            publicKeys.signPublicKey !== input.expected.signPublicKey
            || publicKeys.boxPublicKey !== input.expected.boxPublicKey
        ) {
            await wipeAccountKeys(keys);
            throw new Error("The CLI key does not match this account.");
        }

        return keys;
    } finally {
        wipe(sodium, seed);
    }
}

export async function generateCliTransportKeyPair() {
    const sodium = await loadSodium();
    const keyPair = sodium.crypto_box_keypair();

    return {
        publicKey: toBase64(sodium, keyPair.publicKey),
        secretKey: keyPair.privateKey,
    };
}

export async function sealCliPackage(input: {
    clientShare: Uint8Array;
    wrapKey: Uint8Array;
    transportPublicKey: string;
}) {
    const sodium = await loadSodium();
    const plaintext = concatBytes(input.clientShare, input.wrapKey);

    try {
        return toBase64(
            sodium,
            sodium.crypto_box_seal(
                plaintext,
                fromBase64(sodium, input.transportPublicKey, sodium.crypto_box_PUBLICKEYBYTES)
            )
        );
    } finally {
        wipe(sodium, plaintext);
    }
}

export async function openCliPackage(input: {
    sealedPackage: string;
    transportPublicKey: string;
    transportSecretKey: Uint8Array;
}) {
    const sodium = await loadSodium();
    let plaintext: Uint8Array;

    try {
        plaintext = sodium.crypto_box_seal_open(
            fromBase64(sodium, input.sealedPackage),
            fromBase64(sodium, input.transportPublicKey, sodium.crypto_box_PUBLICKEYBYTES),
            input.transportSecretKey
        );
    } catch {
        throw new Error("Could not open the CLI key package.");
    }

    if (plaintext.length !== CRYPTO_KEY_BYTE_LENGTH * 2) {
        wipe(sodium, plaintext);
        throw new Error("The CLI key package is malformed.");
    }

    const clientShare = plaintext.slice(0, CRYPTO_KEY_BYTE_LENGTH);
    const wrapKey = plaintext.slice(CRYPTO_KEY_BYTE_LENGTH);
    wipe(sodium, plaintext);

    return { clientShare, wrapKey };
}

export async function computeVerificationCode(transportPublicKey: string) {
    const sodium = await loadSodium();
    const digest = sodium.crypto_generichash(
        VERIFICATION_CODE_BYTE_LENGTH,
        encodeFields(CRYPTO_DOMAIN.verificationCode, [
            fromBase64(sodium, transportPublicKey, sodium.crypto_box_PUBLICKEYBYTES),
        ]),
        null
    );
    let bits = 0;
    let bitCount = 0;
    let code = "";

    for (const byte of digest) {
        bits = (bits << 8) | byte;
        bitCount += 8;

        while (bitCount >= 5) {
            bitCount -= 5;
            code += VERIFICATION_CODE_ALPHABET[(bits >> bitCount) & 31];
        }

        bits &= (1 << bitCount) - 1;
    }

    return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}
