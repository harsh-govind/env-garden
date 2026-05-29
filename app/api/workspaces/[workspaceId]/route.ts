import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeWorkspaceDetail } from "@/lib/workspace-serializers";
import { getWorkspaceDetailForUser } from "@/prisma/services/workspace";
import type { WorkspaceRouteContext } from "@/types/workspace";

export async function GET(_: Request, context: WorkspaceRouteContext) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await context.params;

    if (!workspaceId) {
        return NextResponse.json(
            { error: "Workspace id is required." },
            { status: 400 }
        );
    }

    const workspace = await getWorkspaceDetailForUser(workspaceId, session.user.id);

    if (!workspace) {
        return NextResponse.json(
            { error: "Workspace not found or access denied." },
            { status: 404 }
        );
    }

    return NextResponse.json({
        workspace: serializeWorkspaceDetail(workspace),
    });
}
