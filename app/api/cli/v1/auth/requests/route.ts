import { NextResponse } from "next/server";
import {
    CLI_LOGIN_POLL_INTERVAL_SECONDS,
    CLI_TOKEN_NAME_MAX_LENGTH,
    cliNoStoreHeaders,
    cliTokenHashPattern,
    cliTokenVisiblePrefixPattern,
} from "@/constants/cli";
import { createCliLoginRequest } from "@/lib/cli/login";
import type { CreateCliLoginRequestBody } from "@/types/cli";

export async function POST(request: Request) {
    try {
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
        });
        const authorizationUrl = new URL(
            `/cli/authorize/${loginRequest.id}`,
            request.url
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
