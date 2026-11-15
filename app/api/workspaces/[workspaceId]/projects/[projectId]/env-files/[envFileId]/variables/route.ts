import { NextResponse } from "next/server";
import { ENV_VARIABLE_NOTE_MAX_LENGTH, envKeyPattern } from "@/constants/environment";
import { parseSaveEnvVariablesBody } from "@/lib/env-variables";
import { API_RATE_LIMIT, REVEAL_RATE_LIMIT } from "@/constants/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getRequestSession } from "@/lib/request-auth";
import { serializeProjectEnvVariable } from "@/utils/serializers/project";
import {
    createEnvVariableForFile,
    getEnvVariableForFile,
    getEnvVariablesForFile,
    replaceEnvVariablesForFile,
} from "@/prisma/services/project";
import type {
    CreateEnvVariableBody,
    ProjectEnvFileRouteContext,
    SaveEnvVariablesBody,
} from "@/types/project";


function parseCreateEnvVariableBody(body: CreateEnvVariableBody) {
    const key = typeof body.key === "string" ? body.key.trim() : "";
    const value = typeof body.value === "string" ? body.value : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!envKeyPattern.test(key)) {
        return {
            error:
                "Variable key must start with a letter or underscore and contain only letters, numbers, and underscores.",
        };
    }

    if (key.length > 120) {
        return { error: "Variable key must be 120 characters or less." };
    }

    if (typeof body.value !== "string") {
        return { error: "Variable value is required." };
    }

    if (value.length > 10000) {
        return { error: "Variable value must be 10,000 characters or less." };
    }

    if (note.length > ENV_VARIABLE_NOTE_MAX_LENGTH) {
        return { error: `Variable note must be ${ENV_VARIABLE_NOTE_MAX_LENGTH} characters or less.` };
    }

    return {
        value: {
            key,
            value,
            note: note || null,
            isCommented: body.isCommented === true,
        },
    };
}

export async function GET(request: Request, context: ProjectEnvFileRouteContext) {
    try {
        const session = await getRequestSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

        if (limited) {
            return limited;
        }

        const revealLimited = await rateLimitResponse(REVEAL_RATE_LIMIT, session.user.id);

        if (revealLimited) {
            return revealLimited;
        }

        const { workspaceId, projectId, envFileId } = await context.params;

        if (!workspaceId || !projectId || !envFileId) {
            return NextResponse.json(
                { error: "Workspace id, project id, and env file id are required." },
                { status: 400 }
            );
        }

        const variableId = new URL(request.url).searchParams
            .get("variableId")
            ?.trim();

        if (variableId) {
            const result = await getEnvVariableForFile({
                workspaceId,
                projectId,
                envFileId,
                variableId,
                userId: session.user.id,
            });

            if (result.status === "NOT_FOUND") {
                return NextResponse.json(
                    { error: "Env variable not found or access denied." },
                    { status: 404 }
                );
            }

            if (result.status === "FORBIDDEN") {
                return NextResponse.json(
                    { error: "You do not have access to read this env file." },
                    { status: 403 }
                );
            }

            return NextResponse.json({
                variable: serializeProjectEnvVariable(result.variable),
            });
        }

        const result = await getEnvVariablesForFile({
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
                { error: "You do not have access to read this env file." },
                { status: 403 }
            );
        }

        return NextResponse.json({
            variables: result.variables.map(serializeProjectEnvVariable),
        });
    } catch (error) {
        console.error("Failed to read env variables:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request, context: ProjectEnvFileRouteContext) {
    try {
        const session = await getRequestSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

        if (limited) {
            return limited;
        }

        const { workspaceId, projectId, envFileId } = await context.params;

        if (!workspaceId || !projectId || !envFileId) {
            return NextResponse.json(
                { error: "Workspace id, project id, and env file id are required." },
                { status: 400 }
            );
        }

        const body = (await request
            .json()
            .catch(() => null)) as CreateEnvVariableBody | null;

        if (!body) {
            return NextResponse.json(
                { error: "Invalid JSON payload." },
                { status: 400 }
            );
        }

        const parsed = parseCreateEnvVariableBody(body);

        if ("error" in parsed) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const result = await createEnvVariableForFile({
            workspaceId,
            projectId,
            envFileId,
            userId: session.user.id,
            key: parsed.value.key,
            value: parsed.value.value,
            note: parsed.value.note,
            isCommented: parsed.value.isCommented,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Env file not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "You do not have access to edit this env file." },
                { status: 403 }
            );
        }

        if (result.status === "CONFLICT") {
            return NextResponse.json(
                { error: "A variable with that key already exists in this env file." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                variable: serializeProjectEnvVariable(result.variable),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Failed to create env variable:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request, context: ProjectEnvFileRouteContext) {
    try {
        const session = await getRequestSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

        if (limited) {
            return limited;
        }

        const { workspaceId, projectId, envFileId } = await context.params;

        if (!workspaceId || !projectId || !envFileId) {
            return NextResponse.json(
                { error: "Workspace id, project id, and env file id are required." },
                { status: 400 }
            );
        }

        const body = (await request
            .json()
            .catch(() => null)) as SaveEnvVariablesBody | null;

        if (!body) {
            return NextResponse.json(
                { error: "Invalid JSON payload." },
                { status: 400 }
            );
        }

        const parsed = parseSaveEnvVariablesBody(body);

        if ("error" in parsed) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const result = await replaceEnvVariablesForFile({
            workspaceId,
            projectId,
            envFileId,
            userId: session.user.id,
            variables: parsed.value.variables,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Env file not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "You do not have access to edit this env file." },
                { status: 403 }
            );
        }

        if (result.status === "CONFLICT") {
            return NextResponse.json(
                { error: "Variable keys must be unique within this env file." },
                { status: 409 }
            );
        }

        return NextResponse.json({
            variables: result.variables.map(serializeProjectEnvVariable),
        });
    } catch (error) {
        console.error("Failed to save env variables:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
