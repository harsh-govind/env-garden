import "server-only";
import { NextResponse } from "next/server";
import { cliNoStoreHeaders } from "@/constants/cli";
import { authenticateCliRequest } from "@/lib/cli/auth";
import type { CliAuthenticatedUser } from "@/types/cli";

export function cliJson(body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: cliNoStoreHeaders });
}

/** Authenticates the CLI bearer token, then runs the handler for that user. */
export async function withCliUser(
    request: Request,
    handler: (user: CliAuthenticatedUser) => Promise<Response>
) {
    try {
        const authentication = await authenticateCliRequest(request);

        if (authentication.status === "UNAUTHORIZED") {
            return cliJson(
                { error: "Your CLI session has expired or was revoked. Run `eit login` again." },
                401
            );
        }

        return await handler(authentication.user);
    } catch (error) {
        console.error("CLI request failed:", error);
        return cliJson({ error: "Internal server error." }, 500);
    }
}
