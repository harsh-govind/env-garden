import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkspaceHistoryEntryForUser } from "@/prisma/services/workspace-history";
import type { WorkspaceHistoryEntryRouteContext } from "@/types/workspace";

export async function GET(_: Request, context: WorkspaceHistoryEntryRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, historyId } = await context.params;

        if (!workspaceId || !historyId) {
            return NextResponse.json(
                { error: "Workspace id and history id are required." },
                { status: 400 }
            );
        }

        const result = await getWorkspaceHistoryEntryForUser({
            workspaceId,
            historyId,
            userId: session.user.id,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "History entry not found or access denied." },
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
            history: {
                id: result.entry.id,
                workspaceId: result.entry.workspaceId,
                operation: result.entry.operation,
                message: result.entry.message,
                data: result.entry.data,
                createdAt: result.entry.createdAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("Failed to load workspace history detail:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
