import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeWorkspaceDetail } from "@/utils/serializers/workspace";
import {
    deleteWorkspaceForUser,
    getWorkspaceDetailForUser,
    renameWorkspaceForUser,
} from "@/prisma/services/workspace";
import type {
    DeleteWorkspaceResponse,
    RenameWorkspaceBody,
    RenameWorkspaceResponse,
    WorkspaceRouteContext,
} from "@/types/workspace";

export async function GET(_: Request, context: WorkspaceRouteContext) {
    try {
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

        const workspace = await getWorkspaceDetailForUser(
            workspaceId,
            session.user.id
        );

        if (!workspace) {
            return NextResponse.json(
                { error: "Workspace not found or access denied." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            workspace: serializeWorkspaceDetail(workspace),
        });
    } catch (error) {
        console.error("Failed to load workspace detail:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request, context: WorkspaceRouteContext) {
    try {
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

        const body = (await request.json().catch(() => null)) as
            | RenameWorkspaceBody
            | null;

        if (!body) {
            return NextResponse.json(
                { error: "Invalid JSON payload." },
                { status: 400 }
            );
        }

        const name = typeof body.name === "string" ? body.name.trim() : "";

        if (name.length < 2 || name.length > 80) {
            return NextResponse.json(
                { error: "Workspace name must be between 2 and 80 characters." },
                { status: 400 }
            );
        }

        const result = await renameWorkspaceForUser({
            workspaceId,
            userId: session.user.id,
            name,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Workspace not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "Only workspace admins can rename this workspace." },
                { status: 403 }
            );
        }

        if (result.status === "INVALID_NAME") {
            return NextResponse.json(
                { error: "Workspace name must be between 2 and 80 characters." },
                { status: 400 }
            );
        }

        const payload: RenameWorkspaceResponse = {
            workspace: {
                id: result.workspace.id,
                name: result.workspace.name,
            },
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to rename workspace:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function DELETE(_: Request, context: WorkspaceRouteContext) {
    try {
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

        const result = await deleteWorkspaceForUser({
            workspaceId,
            userId: session.user.id,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Workspace not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "Only workspace owners can delete this workspace." },
                { status: 403 }
            );
        }

        const payload: DeleteWorkspaceResponse = {
            success: true,
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to delete workspace:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
