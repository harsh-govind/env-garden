import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listWorkspaceHistoryForUser } from "@/prisma/services/workspace-history";
import type { WorkspaceRouteContext } from "@/types/workspace";

export async function GET(request: Request, context: WorkspaceRouteContext) {
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

    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    if (query.length > 120) {
        return NextResponse.json(
            { error: "History search must be 120 characters or less." },
            { status: 400 }
        );
    }

    const result = await listWorkspaceHistoryForUser({
        workspaceId,
        userId: session.user.id,
        query,
    });

    if (result.status === "NOT_FOUND") {
        return NextResponse.json(
            { error: "Workspace not found or access denied." },
            { status: 404 }
        );
    }

    if (result.status === "FORBIDDEN") {
        return NextResponse.json(
            { error: "Only owners and admins can view workspace history." },
            { status: 403 }
        );
    }

    return NextResponse.json({
        history: result.entries.map((entry) => ({
            id: entry.id,
            operation: entry.operation,
            message: entry.message,
            createdAt: entry.createdAt.toISOString(),
        })),
    });
}
