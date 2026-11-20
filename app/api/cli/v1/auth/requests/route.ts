import { NextResponse } from "next/server";
import { CLI_LOGIN_RATE_LIMIT } from "@/constants/rate-limit";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getAppUrl } from "@/lib/app-url";
import {
    CLI_LOGIN_POLL_INTERVAL_SECONDS,
    CLI_TOKEN_NAME_MAX_LENGTH,
    cliNoStoreHeaders,
    cliTokenHashPattern,
    cliTokenVisiblePrefixPattern,
} from "@/constants/cli";
import { createCliLoginRequest } from "@/lib/cli/login";
import { decodeBase64Field } from "@/lib/crypto-payload";
import type { CreateCliLoginRequestBody } from "@/types/cli";

export async function POST(request: Request) {
    try {
        const limited = await rateLimitResponse(CLI_LOGIN_RATE_LIMIT, getClientIp(request));

        if (limited) {
            return limited;
        }

        const body = (await request.json().catch(() => null)) as
            | CreateCliLoginRequestBody
            | null;
        const tokenHash = typeof body?.tokenHash === "string"
            ? body.tokenHash.trim().toLowerCase()
            : "";
        const tokenPrefix = typeof body?.tokenPrefix === "string"
            ? body.tokenPrefix.trim()
            : "";
        const tokenName = typeof body?.tokenName === "string"
            ? body.tokenName.trim()
            : "";

        const transportPublicKey = decodeBase64Field(body?.transportPublicKey, 32);

        if (!transportPublicKey) {
            return NextResponse.json(
                { error: "This version of eit is too old. Update it with npm i -g @env-garden/cli." },
                { status: 400, headers: cliNoStoreHeaders }
            );
        }

        if (!cliTokenHashPattern.test(tokenHash)) {
            return NextResponse.json(
                { error: "Invalid CLI token hash." },
                { status: 400, headers: cliNoStoreHeaders }
            );
        }

        if (!cliTokenVisiblePrefixPattern.test(tokenPrefix)) {
            return NextResponse.json(
                { error: "Invalid CLI token prefix." },
                { status: 400, headers: cliNoStoreHeaders }
            );
        }

        if (
            tokenName.length < 1
            || tokenName.length > CLI_TOKEN_NAME_MAX_LENGTH
        ) {
            return NextResponse.json(
                { error: "CLI token name must be between 1 and 80 characters." },
                { status: 400, headers: cliNoStoreHeaders }
            );
        }

        const loginRequest = await createCliLoginRequest({
            tokenHash,
            tokenPrefix,
            tokenName,
            transportPublicKey,
        });
        const authorizationUrl = new URL(
            `/cli/authorize/${loginRequest.id}`,
            getAppUrl(request)
        ).toString();

        return NextResponse.json(
            {
                requestId: loginRequest.id,
                pollSecret: loginRequest.pollSecret,
                authorizationUrl,
                expiresAt: loginRequest.expiresAt.toISOString(),
                intervalSeconds: CLI_LOGIN_POLL_INTERVAL_SECONDS,
            },
            { status: 201, headers: cliNoStoreHeaders }
        );
    } catch (error) {
        console.error("Failed to create CLI login request:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500, headers: cliNoStoreHeaders }
        );
    }
}
