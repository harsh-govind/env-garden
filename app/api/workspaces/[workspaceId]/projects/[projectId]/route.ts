import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeProjectDetail } from "@/lib/project-serializers";
import { getProjectDetailForUser } from "@/prisma/services/project";
import type { ProjectRouteContext } from "@/types/project";

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

