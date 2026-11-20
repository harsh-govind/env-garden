import type { VARIABLE_FIELDS } from "@/constants/crypto";

export type PassphraseKdfParams = {
    algorithm: "argon2id13";
    opsLimit: number;
    memLimitBytes: number;
};

export type AccountKeys = {
    seed: Uint8Array;
    signPublicKey: Uint8Array;
    signSecretKey: Uint8Array;
    boxPublicKey: Uint8Array;
    boxSecretKey: Uint8Array;
};

export type PublicAccountKeys = {
    signPublicKey: string;
    boxPublicKey: string;
};

export type EncryptedKeyringPayload = PublicAccountKeys & {
    encryptedSeed: string;
    kdfSalt: string;
    kdfParams: PassphraseKdfParams;
};

export type EnvironmentKeyMaterial = {
    secret: Uint8Array;
    dataKey: Uint8Array;
    digestKey: Uint8Array;
};

export type EnvironmentShareContext = {
    environmentKeyId: string;
    version: number;
    recipientUserId: string;
    recipientBoxPublicKey: string;
};

export type SealedEnvironmentShare = {
    sealedSecret: string;
    signature: string;
};

export type VariableField = (typeof VARIABLE_FIELDS)[number];

export type VariableCipherContext = {
    envFileId: string;
    keyVersion: number;
    keyDigest: string;
    isCommented: boolean;
};

export type PlainVariable = {
    key: string;
    value: string;
    note: string | null;
    isCommented: boolean;
};

export type EncryptedVariable = {
    keyDigest: string;
    encryptedKey: string;
    encryptedValue: string;
    encryptedNote: string | null;
    isCommented: boolean;
    keyVersion: number;
};

export type CliKeyShares = {
    clientShare: Uint8Array;
    wrapKey: Uint8Array;
    encryptedServerShare: string;
};
