import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createProjectForWorkspace } from "@/prisma/services/project";
import type { WorkspaceRouteContext } from "@/types/workspace";

function parseCreateProjectBody(body: any) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (name.length < 2 || name.length > 80) {
        return { error: "Project name must be between 2 and 80 characters." };
    }

    if (description.length > 280) {
        return { error: "Project description must be 280 characters or less." };
    }

    return { value: { name, description: description || null } };
}

export async function POST(request: Request, context: WorkspaceRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId } = await context.params;

        if (!workspaceId) {
            return NextResponse.json({ error: "Workspace id is required." }, { status: 400 });
        }

        const body = (await request.json().catch(() => null)) as any | null;

        if (!body) {
            return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
        }

        const parsed = parseCreateProjectBody(body);

        if ("error" in parsed) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const project = await createProjectForWorkspace({
            workspaceId,
            userId: session.user.id,
            name: parsed.value.name,
            description: parsed.value.description,
        });

        return NextResponse.json({ projectId: project.id }, { status: 201 });
    } catch (error) {
        console.error("Failed to create project:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
