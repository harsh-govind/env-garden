import { NextResponse } from "next/server";
import { API_RATE_LIMIT } from "@/constants/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getRequestSession } from "@/lib/request-auth";
import {
    defaultProjectEnvironmentTypes,
    isEnvironmentTypeValue,
} from "@/constants/environment";
import { parseNewEnvironmentKeys } from "@/lib/environment-keys";
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

    const environmentKeys = parseNewEnvironmentKeys(body.environmentKeys, environments);

    if (!environmentKeys) {
        return { error: "Each environment needs an encryption key created in your browser." };
    }

    return { value: { name, description: description || null, environments, environmentKeys } };
}

export async function POST(request: Request, context: WorkspaceRouteContext) {
    try {
        const session = await getRequestSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

        if (limited) {
            return limited;
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
            environmentKeys: parsed.value.environmentKeys,
        });

        if (project.status === "NOT_FOUND") {
            return NextResponse.json({ error: "Workspace not found or access denied." }, { status: 404 });
        }

        if (project.status === "KEYRING_REQUIRED") {
            return NextResponse.json({ error: "Set up your encryption keys first." }, { status: 409 });
        }

        if (project.status === "INVALID_KEY") {
            return NextResponse.json(
                { error: "The environment keys were not signed by your account." },
                { status: 400 }
            );
        }

        if (project.status === "CONFLICT") {
            return NextResponse.json({ error: "Those environment keys already exist. Try again." }, { status: 409 });
        }

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
