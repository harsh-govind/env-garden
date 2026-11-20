export const CRYPTO_KEY_BYTE_LENGTH = 32;
export const ACCOUNT_SEED_BYTE_LENGTH = 32;
export const ENVIRONMENT_SECRET_BYTE_LENGTH = 32;
export const KEY_DIGEST_BYTE_LENGTH = 32;
export const FINGERPRINT_BYTE_LENGTH = 20;
export const VERIFICATION_CODE_BYTE_LENGTH = 5;
export const PASSPHRASE_SALT_BYTE_LENGTH = 16;

export const VAULT_PASSPHRASE_MIN_LENGTH = 12;
export const VAULT_PASSPHRASE_MAX_LENGTH = 256;

export const DEFAULT_PASSPHRASE_KDF_PARAMS = {
    algorithm: "argon2id13",
    opsLimit: 3,
    memLimitBytes: 64 * 1024 * 1024,
} as const;

export const MIN_PASSPHRASE_KDF_OPS_LIMIT = 2;
export const MAX_PASSPHRASE_KDF_OPS_LIMIT = 10;
export const MIN_PASSPHRASE_KDF_MEM_LIMIT_BYTES = 32 * 1024 * 1024;
export const MAX_PASSPHRASE_KDF_MEM_LIMIT_BYTES = 512 * 1024 * 1024;

export const ACCOUNT_KDF_CONTEXT = "egacct01";
export const ACCOUNT_SIGN_SUBKEY_ID = 1;
export const ACCOUNT_BOX_SUBKEY_ID = 2;

export const ENVIRONMENT_KDF_CONTEXT = "egenv001";
export const ENVIRONMENT_DATA_SUBKEY_ID = 1;
export const ENVIRONMENT_DIGEST_SUBKEY_ID = 2;

export const CRYPTO_DOMAIN = {
    keyring: "env-garden/keyring/v1",
    fingerprint: "env-garden/fingerprint/v1",
    share: "env-garden/share/v1",
    variable: "env-garden/variable/v1",
    cliShare: "env-garden/cli-share/v1",
    cliPackage: "env-garden/cli-package/v1",
    verificationCode: "env-garden/verification-code/v1",
} as const;

export const VARIABLE_FIELDS = ["key", "value", "note"] as const;

export const ENVIRONMENT_KEY_ID_BYTE_LENGTH = 16;

export const AEAD_OVERHEAD_BYTES = 24 + 16;
export const SEALED_SECRET_BYTE_LENGTH = 32 + 48;
export const SIGNATURE_BYTE_LENGTH = 64;
export const MAX_UTF8_BYTES_PER_CHARACTER = 4;

export const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
export const environmentKeyIdPattern = /^[A-Za-z0-9_-]{22}$/;
export const keyDigestPattern = /^[A-Za-z0-9+/]{43}=$/;
export const publicKeyPattern = /^[A-Za-z0-9+/]{43}=$/;

export const VERIFICATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
