import { NextResponse } from "next/server";
import { API_RATE_LIMIT } from "@/constants/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getRequestSession } from "@/lib/request-auth";
import { isEnvironmentTypeValue } from "@/constants/environment";
import { parseNewEnvironmentKey } from "@/lib/environment-keys";
import {
    serializeProjectEnvFile,
    serializeProjectEnvironmentKey,
} from "@/utils/serializers/project";
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

    const environmentKey = body.environmentKey === undefined || body.environmentKey === null
        ? null
        : parseNewEnvironmentKey(body.environmentKey, body.environment);

    if (body.environmentKey && !environmentKey) {
        return { error: "Invalid environment key." };
    }

    return {
        value: {
            name: name || null,
            environment: body.environment,
            description: description || null,
            environmentKey,
        },
    };
}

export async function POST(request: Request, context: ProjectRouteContext) {
    try {
        const session = await getRequestSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

        if (limited) {
            return limited;
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
            environmentKey: parsed.value.environmentKey,
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

        if (result.status === "KEY_REQUIRED") {
            return NextResponse.json(
                { error: "Create an encryption key for this new environment." },
                { status: 409 }
            );
        }

        if (result.status === "KEYRING_REQUIRED") {
            return NextResponse.json(
                { error: "Set up your encryption keys first." },
                { status: 409 }
            );
        }

        if (result.status === "INVALID_KEY") {
            return NextResponse.json(
                { error: "The environment key was not signed by your account." },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                envFile: serializeProjectEnvFile(result.envFile),
                environmentKey: result.environmentKey
                    ? serializeProjectEnvironmentKey(result.environmentKey)
                    : null,
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

