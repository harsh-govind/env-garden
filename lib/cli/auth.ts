import "server-only";
import { cliBearerTokenPattern } from "@/constants/cli";
import { hashCliToken, isCliToken } from "@/lib/cli/token";
import { findAndTouchActiveCliToken } from "@/prisma/services/cli";
import type { CliAuthenticationResult } from "@/types/cli";

function readBearerToken(request: Request) {
    const authorization = request.headers.get("authorization");

    if (!authorization) {
        return null;
    }

    const match = cliBearerTokenPattern.exec(authorization.trim());
    return match?.[1]?.trim() || null;
}

export async function authenticateCliRequest(
    request: Request
): Promise<CliAuthenticationResult> {
    const token = readBearerToken(request);

    if (!token || !isCliToken(token)) {
        return { status: "UNAUTHORIZED" };
    }

    const cliToken = await findAndTouchActiveCliToken({
        tokenHash: hashCliToken(token),
        usedAt: new Date(),
    });

    if (!cliToken) {
        return { status: "UNAUTHORIZED" };
    }

    return {
        status: "OK",
        tokenId: cliToken.id,
        tokenName: cliToken.name,
        expiresAt: cliToken.expiresAt,
        user: cliToken.user,
    };
}
