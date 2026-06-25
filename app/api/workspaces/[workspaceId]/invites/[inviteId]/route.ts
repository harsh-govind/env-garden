import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revokeWorkspaceInvite } from "@/prisma/services/member";
import type { WorkspaceInviteRouteContext } from "@/types/member";

export async function DELETE(_: Request, context: WorkspaceInviteRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, inviteId } = await context.params;

        if (!workspaceId || !inviteId) {
            return NextResponse.json(
                { error: "Workspace id and invite id are required." },
                { status: 400 }
            );
        }

        const result = await revokeWorkspaceInvite({
            workspaceId,
            inviteId,
            actorUserId: session.user.id,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Workspace invite not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "You cannot revoke that invite." },
                { status: 403 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Failed to revoke workspace invite:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
