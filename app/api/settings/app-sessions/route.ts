import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    listActiveAppSessionsForUser,
    revokeOtherAppSessionsForUser,
} from "@/prisma/services/app-session";
import type { AppSessionsResponse } from "@/types/settings";
import { describeUserAgent } from "@/utils/user-agent/describe-user-agent";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const appSessions = await listActiveAppSessionsForUser(session.user.id);
        const response: AppSessionsResponse = {
            sessions: appSessions.map((appSession) => ({
                id: appSession.id,
                device: describeUserAgent(appSession.userAgent),
                ipAddress: appSession.ipAddress,
                createdAt: appSession.createdAt.toISOString(),
                lastSeenAt: appSession.lastSeenAt.toISOString(),
                isCurrent: appSession.id === session.sessionId,
            })),
        };

        return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Failed to list app sessions:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}

/** Signs out every other browser session, keeping the current one. */
export async function DELETE() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const revokedCount = await revokeOtherAppSessionsForUser({
            userId: session.user.id,
            currentSessionId: session.sessionId,
        });

        return NextResponse.json({ revokedCount });
    } catch (error) {
        console.error("Failed to revoke app sessions:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
