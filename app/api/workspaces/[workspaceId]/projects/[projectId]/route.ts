import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeProjectDetail } from "@/lib/project-serializers";
import {
    deleteProject,
    getProjectDetailForUser,
    renameProject,
} from "@/prisma/services/project";
import type {
    DeleteProjectResponse,
    ProjectRouteContext,
    RenameProjectBody,
    RenameProjectResponse,
} from "@/types/project";

export async function GET(_: Request, context: ProjectRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, projectId } = await context.params;

        if (!workspaceId || !projectId) {
            return NextResponse.json(
                { error: "Workspace id and project id are required." },
                { status: 400 }
            );
        }

        const project = await getProjectDetailForUser({
            workspaceId,
            projectId,
            userId: session.user.id,
        });

        if (!project) {
            return NextResponse.json(
                { error: "Project not found or access denied." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            project: serializeProjectDetail(project),
        });
    } catch (error) {
        console.error("Failed to load project detail:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request, context: ProjectRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, projectId } = await context.params;

        if (!workspaceId || !projectId) {
            return NextResponse.json(
                { error: "Workspace id and project id are required." },
                { status: 400 }
            );
        }

        const body = (await request.json().catch(() => null)) as
            | RenameProjectBody
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
                { error: "Project name must be between 2 and 80 characters." },
                { status: 400 }
            );
        }

        const result = await renameProject({
            workspaceId,
            projectId,
            userId: session.user.id,
            name,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Project not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "Only project or workspace admins can rename this project." },
                { status: 403 }
            );
        }

        if (result.status === "INVALID_NAME") {
            return NextResponse.json(
                { error: "Project name must be between 2 and 80 characters." },
                { status: 400 }
            );
        }

        const payload: RenameProjectResponse = {
            project: {
                id: result.project.id,
                name: result.project.name,
                updatedAt: result.project.updatedAt.toISOString(),
            },
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to rename project:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function DELETE(_: Request, context: ProjectRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, projectId } = await context.params;

        if (!workspaceId || !projectId) {
            return NextResponse.json(
                { error: "Workspace id and project id are required." },
                { status: 400 }
            );
        }

        const result = await deleteProject({
            workspaceId,
            projectId,
            userId: session.user.id,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Project not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "Only project or workspace admins can delete this project." },
                { status: 403 }
            );
        }

        const payload: DeleteProjectResponse = {
            success: true,
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to delete project:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

