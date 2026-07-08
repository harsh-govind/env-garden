import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeProjectEnvFile } from "@/lib/project-serializers";
import { deleteEnvFile, renameEnvFile } from "@/prisma/services/project";
import type {
    DeleteEnvFileResponse,
    ProjectEnvFileRouteContext,
    RenameEnvFileBody,
    RenameEnvFileResponse,
} from "@/types/project";

export async function PATCH(
    request: Request,
    context: ProjectEnvFileRouteContext
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, projectId, envFileId } = await context.params;

        if (!workspaceId || !projectId || !envFileId) {
            return NextResponse.json(
                { error: "Workspace id, project id, and env file id are required." },
                { status: 400 }
            );
        }

        const body = (await request.json().catch(() => null)) as
            | RenameEnvFileBody
            | null;

        if (!body) {
            return NextResponse.json(
                { error: "Invalid JSON payload." },
                { status: 400 }
            );
        }

        const name = typeof body.name === "string" ? body.name.trim() : "";

        if (name.length === 0 || name.length > 120) {
            return NextResponse.json(
                { error: "Env file name must be 120 characters or less." },
                { status: 400 }
            );
        }

        const result = await renameEnvFile({
            workspaceId,
            projectId,
            envFileId,
            userId: session.user.id,
            name,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Env file not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "Only project or workspace admins can rename env files." },
                { status: 403 }
            );
        }

        if (result.status === "INVALID_NAME") {
            return NextResponse.json(
                { error: "Env file name must be 120 characters or less." },
                { status: 400 }
            );
        }

        if (result.status === "CONFLICT") {
            return NextResponse.json(
                { error: "An env file with that name already exists." },
                { status: 409 }
            );
        }

        const payload: RenameEnvFileResponse = {
            envFile: serializeProjectEnvFile(result.envFile),
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to rename env file:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _: Request,
    context: ProjectEnvFileRouteContext
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, projectId, envFileId } = await context.params;

        if (!workspaceId || !projectId || !envFileId) {
            return NextResponse.json(
                { error: "Workspace id, project id, and env file id are required." },
                { status: 400 }
            );
        }

        const result = await deleteEnvFile({
            workspaceId,
            projectId,
            envFileId,
            userId: session.user.id,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Env file not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "Only project or workspace admins can delete env files." },
                { status: 403 }
            );
        }

        const payload: DeleteEnvFileResponse = {
            success: true,
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to delete env file:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
