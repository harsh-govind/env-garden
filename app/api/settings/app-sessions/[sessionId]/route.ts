import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revokeAppSessionForUser } from "@/prisma/services/app-session";
import type { AppSessionRouteContext } from "@/types/settings";

export async function DELETE(_request: Request, context: AppSessionRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { sessionId } = await context.params;
        const isRevoked = await revokeAppSessionForUser({
            userId: session.user.id,
            sessionId,
        });

        if (!isRevoked) {
            return NextResponse.json({ error: "Session not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to revoke app session:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
