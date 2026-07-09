import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEnvironmentTypeValue } from "@/constants/environment";
import { serializeProjectEnvFile } from "@/lib/project-serializers";
import { createEnvFileForProject } from "@/prisma/services/project";
import type {
    CreateEnvFileBody,
    ProjectRouteContext,
} from "@/types/project";

function parseCreateEnvFileBody(body: CreateEnvFileBody) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
        typeof body.description === "string" ? body.description.trim() : "";

    if (!isEnvironmentTypeValue(body.environment)) {
        return { error: "Select a supported environment." };
    }

    if (name.length > 120) {
        return { error: "Env file name must be 120 characters or less." };
    }

    if (description.length > 280) {
        return { error: "Env file description must be 280 characters or less." };
    }

    return {
        value: {
            name: name || null,
            environment: body.environment,
            description: description || null,
        },
    };
}

export async function POST(request: Request, context: ProjectRouteContext) {
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

        const body = (await request
            .json()
            .catch(() => null)) as CreateEnvFileBody | null;

        if (!body) {
            return NextResponse.json(
                { error: "Invalid JSON payload." },
                { status: 400 }
            );
        }

        const parsed = parseCreateEnvFileBody(body);

        if ("error" in parsed) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const result = await createEnvFileForProject({
            workspaceId,
            projectId,
            userId: session.user.id,
            name: parsed.value.name,
            environment: parsed.value.environment,
            description: parsed.value.description,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Project not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "Only project or workspace admins can create env files." },
                { status: 403 }
            );
        }

        if (result.status === "CONFLICT") {
            return NextResponse.json(
                { error: "An env file with that name already exists." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                envFile: serializeProjectEnvFile(result.envFile),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Failed to create env file:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

