import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeProjectEnvVariable } from "@/lib/project-serializers";
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

const envKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

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

    if (note.length > 280) {
        return { error: "Variable note must be 280 characters or less." };
    }

    return {
        value: {
            key,
            value,
            note: note || null,
        },
    };
}

function parseSaveEnvVariablesBody(body: SaveEnvVariablesBody) {
    if (!Array.isArray(body.variables)) {
        return { error: "Variables must be an array." };
    }

    if (body.variables.length > 500) {
        return { error: "You can save up to 500 variables at a time." };
    }

    const seenKeys = new Set<string>();
    const variables: {
        id?: string;
        key: string;
        value?: string;
        note: string | null;
    }[] = [];

    for (const rawVariable of body.variables) {
        if (!rawVariable || typeof rawVariable !== "object") {
            return { error: "Each variable must be an object." };
        }

        const variable = rawVariable as Record<string, unknown>;
        const id =
            typeof variable.id === "string" && variable.id.trim().length > 0
                ? variable.id.trim()
                : undefined;
        const key = typeof variable.key === "string" ? variable.key.trim() : "";
        const hasValue = typeof variable.value === "string";
        const value = hasValue ? (variable.value as string) : undefined;
        const note = typeof variable.note === "string" ? variable.note.trim() : "";

        if (!envKeyPattern.test(key)) {
            return {
                error:
                    "Variable keys must start with a letter or underscore and contain only letters, numbers, and underscores.",
            };
        }

        if (key.length > 120) {
            return { error: "Variable keys must be 120 characters or less." };
        }

        if (!id && !hasValue) {
            return { error: `Value is required for ${key}.` };
        }

        if (value !== undefined && value.length > 10000) {
            return { error: `Value for ${key} must be 10,000 characters or less.` };
        }

        if (note.length > 280) {
            return { error: `Note for ${key} must be 280 characters or less.` };
        }

        if (seenKeys.has(key)) {
            return { error: `Duplicate variable key: ${key}.` };
        }

        seenKeys.add(key);
        variables.push({
            id,
            key,
            value,
            note: note || null,
        });
    }

    return {
        value: {
            variables,
        },
    };
}

export async function GET(request: Request, context: ProjectEnvFileRouteContext) {
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
