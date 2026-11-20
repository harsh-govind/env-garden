import "server-only";
import {
    MAX_PASSPHRASE_KDF_MEM_LIMIT_BYTES,
    MAX_PASSPHRASE_KDF_OPS_LIMIT,
    MIN_PASSPHRASE_KDF_MEM_LIMIT_BYTES,
    MIN_PASSPHRASE_KDF_OPS_LIMIT,
    PASSPHRASE_SALT_BYTE_LENGTH,
} from "@/constants/crypto";
import { decodeBase64Field } from "@/lib/crypto-payload";
import type { EncryptedKeyringPayload, PassphraseKdfParams } from "@/types/crypto";
import type { KeyringRecord, SaveKeyringBody } from "@/types/keyring";

const ENCRYPTED_SEED_BYTE_LENGTH = 24 + 32 + 16;

function parseKdfParams(value: unknown): PassphraseKdfParams | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const params = value as Record<string, unknown>;

    if (
        params.algorithm !== "argon2id13"
        || !Number.isInteger(params.opsLimit)
        || !Number.isInteger(params.memLimitBytes)
    ) {
        return null;
    }

    const opsLimit = params.opsLimit as number;
    const memLimitBytes = params.memLimitBytes as number;

    if (
        opsLimit < MIN_PASSPHRASE_KDF_OPS_LIMIT
        || opsLimit > MAX_PASSPHRASE_KDF_OPS_LIMIT
        || memLimitBytes < MIN_PASSPHRASE_KDF_MEM_LIMIT_BYTES
        || memLimitBytes > MAX_PASSPHRASE_KDF_MEM_LIMIT_BYTES
    ) {
        return null;
    }

    return { algorithm: "argon2id13", opsLimit, memLimitBytes };
}

export function parseKeyringBody(
    body: SaveKeyringBody | null
): { value: EncryptedKeyringPayload } | { error: string } {
    if (!body || typeof body !== "object") {
        return { error: "Invalid keyring." };
    }

    const signPublicKey = decodeBase64Field(body.signPublicKey, 32);
    const boxPublicKey = decodeBase64Field(body.boxPublicKey, 32);
    const encryptedSeed = decodeBase64Field(body.encryptedSeed, ENCRYPTED_SEED_BYTE_LENGTH);
    const kdfSalt = decodeBase64Field(body.kdfSalt, PASSPHRASE_SALT_BYTE_LENGTH);
    const kdfParams = parseKdfParams(body.kdfParams);

    if (!signPublicKey || !boxPublicKey) {
        return { error: "Invalid public keys." };
    }

    if (!encryptedSeed || !kdfSalt || !kdfParams) {
        return { error: "Invalid encrypted keyring." };
    }

    return {
        value: {
            signPublicKey,
            boxPublicKey,
            encryptedSeed,
            kdfSalt,
            kdfParams,
        },
    };
}

export function serializeKeyring(keyring: KeyringRecord) {
    return {
        signPublicKey: keyring.signPublicKey,
        boxPublicKey: keyring.boxPublicKey,
        encryptedSeed: keyring.encryptedSeed,
        kdfSalt: keyring.kdfSalt,
        kdfParams: keyring.kdfParams,
        createdAt: keyring.createdAt.toISOString(),
        updatedAt: keyring.updatedAt.toISOString(),
    };
}
