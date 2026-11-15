export const CLI_TOKEN_PREFIX = "eit_";
export const CLI_POLL_SECRET_PREFIX = "eit_poll_";
export const CLI_TOKEN_SECRET_BYTE_LENGTH = 32;
export const CLI_TOKEN_SECRET_LENGTH = 43;
export const CLI_TOKEN_VISIBLE_SECRET_LENGTH = 8;
export const CLI_TOKEN_NAME_MAX_LENGTH = 80;
export const CLI_TOKEN_VALUE_LENGTH =
    CLI_TOKEN_PREFIX.length + CLI_TOKEN_SECRET_LENGTH;
export const CLI_LOGIN_REQUEST_TTL_MS = 10 * 60 * 1000;
export const CLI_LOGIN_POLL_INTERVAL_SECONDS = 2;
export const CLI_TOKEN_TTL_DAYS = 7;
export const CLI_TOKEN_TTL_MS = CLI_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
export const CLI_LOGIN_COMMAND = "npx @env-garden/cli login";

export const cliBearerTokenPattern = /^Bearer\s+(.+)$/i;
export const cliTokenHashPattern = /^[a-f0-9]{64}$/;
export const cliTokenVisiblePrefixPattern = /^eit_[A-Za-z0-9_-]{8}$/;
export const cliPollSecretPattern = /^eit_poll_[A-Za-z0-9_-]{43}$/i;

export const cliNoStoreHeaders = {
    "Cache-Control": "no-store",
} as const;
