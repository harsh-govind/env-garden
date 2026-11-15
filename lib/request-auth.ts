import "server-only";
import { getSession } from "@/lib/auth";
import { authenticateCliRequest } from "@/lib/cli/auth";
import type { RequestSession } from "@/types/auth";

/**
 * The caller of an app API route: a CLI bearer token when an Authorization
 * header is sent, otherwise the browser session. Both resolve to the same
 * user, so routes apply identical permission checks either way.
 */
export async function getRequestSession(request: Request): Promise<RequestSession | null> {
    if (request.headers.has("authorization")) {
        const cli = await authenticateCliRequest(request);

        return cli.status === "OK"
            ? { via: "cli", user: { id: cli.user.id, email: cli.user.email } }
            : null;
    }

    const session = await getSession();

    return session
        ? { via: "web", user: { id: session.user.id, email: session.user.email } }
        : null;
}
