import { NextResponse } from "next/server";
import { CLI_POLL_RATE_LIMIT } from "@/constants/rate-limit";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import {
    cliBearerTokenPattern,
    cliNoStoreHeaders,
    cliPollSecretPattern,
} from "@/constants/cli";
import { getCliLoginRequestStatus } from "@/lib/cli/login";
import type { CliLoginRequestRouteContext } from "@/types/cli";

function readPollSecret(request: Request) {
    const authorization = request.headers.get("authorization");
    const match = authorization
        ? cliBearerTokenPattern.exec(authorization.trim())
        : null;
    const pollSecret = match?.[1]?.trim() ?? null;
    return pollSecret && cliPollSecretPattern.test(pollSecret)
        ? pollSecret
        : null;
}

export async function GET(
    request: Request,
    context: CliLoginRequestRouteContext
) {
    try {
        const limited = await rateLimitResponse(CLI_POLL_RATE_LIMIT, getClientIp(request));

        if (limited) {
            return limited;
        }

        const pollSecret = readPollSecret(request);
        const { requestId } = await context.params;

        if (!pollSecret || !requestId) {
            return NextResponse.json(
                { error: "Invalid CLI login request." },
                { status: 401, headers: cliNoStoreHeaders }
            );
        }

        const result = await getCliLoginRequestStatus({
            requestId,
            pollSecret,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "CLI login request not found." },
                { status: 404, headers: cliNoStoreHeaders }
            );
        }

        return NextResponse.json(
            { status: result.status },
            { headers: cliNoStoreHeaders }
        );
    } catch (error) {
        console.error("Failed to read CLI login request:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500, headers: cliNoStoreHeaders }
        );
    }
}
