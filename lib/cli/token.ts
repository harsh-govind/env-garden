import "server-only";
import { createHash, randomBytes } from "crypto";
import {
    CLI_TOKEN_PREFIX,
    CLI_TOKEN_SECRET_BYTE_LENGTH,
    CLI_TOKEN_VALUE_LENGTH,
    CLI_TOKEN_VISIBLE_SECRET_LENGTH,
} from "@/constants/cli";

export function hashCliToken(token: string) {
    return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateCliToken() {
    const token = `${CLI_TOKEN_PREFIX}${randomBytes(
        CLI_TOKEN_SECRET_BYTE_LENGTH
    ).toString("base64url")}`;

    return {
        token,
        tokenHash: hashCliToken(token),
        tokenPrefix: token.slice(
            0,
            CLI_TOKEN_PREFIX.length + CLI_TOKEN_VISIBLE_SECRET_LENGTH
        ),
    };
}

export function isCliToken(value: string) {
    return (
        value.startsWith(CLI_TOKEN_PREFIX)
        && value.length === CLI_TOKEN_VALUE_LENGTH
    );
}
