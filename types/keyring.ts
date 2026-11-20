import type { EncryptedKeyringPayload } from "@/types/crypto";

export type KeyringRecord = EncryptedKeyringPayload & {
    createdAt: Date;
    updatedAt: Date;
};

export type KeyringResponse = {
    keyring: (EncryptedKeyringPayload & {
        createdAt: string;
        updatedAt: string;
    }) | null;
};

export type SaveKeyringBody = {
    signPublicKey?: unknown;
    boxPublicKey?: unknown;
    encryptedSeed?: unknown;
    kdfSalt?: unknown;
    kdfParams?: unknown;
};

export type SaveKeyringResult =
    | { status: "OK"; keyring: KeyringRecord }
    | { status: "CONFLICT" }
    | { status: "NOT_FOUND" }
    | { status: "KEY_MISMATCH" };
