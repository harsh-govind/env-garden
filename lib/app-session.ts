import "server-only";
import { headers } from "next/headers";
import {
    APP_SESSION_REVOKED_ERROR,
    APP_SESSION_TOUCH_INTERVAL_MS,
    LEGACY_APP_SESSION_ID_PREFIX,
} from "@/constants/auth";
import {
    createAppSession,
    findAppSession,
    touchAppSession,
    upsertLegacyAppSession,
} from "@/prisma/services/app-session";
import type { RequestClientInfo, ResolveAppSessionInput } from "@/types/settings";

async function getRequestClientInfo(): Promise<RequestClientInfo> {
    try {
        const requestHeaders = await headers();
        const forwardedFor = requestHeaders.get("x-forwarded-for");

        return {
            userAgent: requestHeaders.get("user-agent"),
            ipAddress: forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip"),
        };
    } catch {
        // Not inside a request (e.g. build time).
        return { userAgent: null, ipAddress: null };
    }
}

/**
 * Returns the app session id for a signed-in JWT, creating one on sign-in
 * (or adopting tokens issued before sessions were tracked). Throws when the
 * session was revoked, which makes NextAuth clear the cookie.
 */
export async function resolveAppSessionId(input: ResolveAppSessionInput): Promise<string> {
    if (input.isSignIn) {
        const session = await createAppSession({
            userId: input.userId,
            ...(await getRequestClientInfo()),
        });

        return session.id;
    }

    // Server-side session reads can't rewrite the cookie, so tokens from
    // before sessions were tracked share one stable record per user.
    const session = input.sessionId
        ? await findAppSession(input.sessionId)
        : await upsertLegacyAppSession({
            sessionId: `${LEGACY_APP_SESSION_ID_PREFIX}${input.userId}`,
            userId: input.userId,
            ...(await getRequestClientInfo()),
        });

    if (!session || session.revokedAt || session.userId !== input.userId) {
        throw new Error(APP_SESSION_REVOKED_ERROR);
    }

    if (Date.now() - session.lastSeenAt.getTime() > APP_SESSION_TOUCH_INTERVAL_MS) {
        await touchAppSession(session.id);
    }

    return session.id;
}
