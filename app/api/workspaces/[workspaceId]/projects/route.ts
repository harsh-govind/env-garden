import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    defaultProjectEnvironmentTypes,
    isEnvironmentTypeValue,
} from "@/constants/environment";
import { createProjectForWorkspace } from "@/prisma/services/project";
import type {
    CreateProjectBody,
    EnvironmentTypeValue,
    WorkspaceRouteContext,
} from "@/types/workspace";

function parseCreateProjectBody(body: CreateProjectBody) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (name.length < 2 || name.length > 80) {
        return { error: "Project name must be between 2 and 80 characters." };
    }

    if (description.length > 280) {
        return { error: "Project description must be 280 characters or less." };
    }

    if (body.environments !== undefined && !Array.isArray(body.environments)) {
        return { error: "Project environments must be an array." };
    }

    const rawEnvironments = Array.isArray(body.environments)
        ? body.environments
        : defaultProjectEnvironmentTypes;

    const environments: EnvironmentTypeValue[] = [];

    for (const rawEnvironment of rawEnvironments) {
        if (!isEnvironmentTypeValue(rawEnvironment)) {
            return { error: "Project environments include an unsupported value." };
        }

        if (!environments.includes(rawEnvironment)) {
            environments.push(rawEnvironment);
        }
    }

    if (environments.length === 0) {
        return { error: "Select at least one project environment." };
    }

    return { value: { name, description: description || null, environments } };
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

        const body = (await request.json().catch(() => null)) as CreateProjectBody | null;

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
            environments: parsed.value.environments,
        });

        return NextResponse.json(
            {
                envFileCount: project.envFileCount,
                project: {
                    id: project.project.id,
                    name: project.project.name,
                    updatedAt: project.project.updatedAt.toISOString(),
                },
                projectId: project.project.id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Failed to create project:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
