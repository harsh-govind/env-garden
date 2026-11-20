import { NextResponse } from "next/server";
import { parseSaveEnvVariablesBody } from "@/lib/env-variables";
import { API_RATE_LIMIT, REVEAL_RATE_LIMIT } from "@/constants/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getRequestSession } from "@/lib/request-auth";
import {
    serializeProjectEnvironmentKey,
    serializeProjectEnvVariableCipher,
} from "@/utils/serializers/project";
import {
    getEnvVariablesForFile,
    replaceEnvVariablesForFile,
} from "@/prisma/services/project";
import type {
    ProjectEnvFileRouteContext,
    SaveEnvVariablesBody,
} from "@/types/project";

const noStoreHeaders = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: noStoreHeaders });
}

export async function GET(request: Request, context: ProjectEnvFileRouteContext) {
    try {
        const session = await getRequestSession(request);

        if (!session?.user?.id) {
            return json({ error: "Unauthorized" }, 401);
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
            return json({ error: "Workspace id, project id, and env file id are required." }, 400);
        }

        const result = await getEnvVariablesForFile({
            workspaceId,
            projectId,
            envFileId,
            userId: session.user.id,
            via: session.via === "cli" ? "cli" : undefined,
        });

        if (result.status === "NOT_FOUND") {
            return json({ error: "Env file not found or access denied." }, 404);
        }

        if (result.status === "FORBIDDEN") {
            return json({ error: "You do not have access to read this env file." }, 403);
        }

        if (result.status === "NO_KEY") {
            return json({ error: "Nobody has shared this environment's key with you yet." }, 403);
        }

        return json({
            variables: result.variables.map(serializeProjectEnvVariableCipher),
            environmentKey: serializeProjectEnvironmentKey(result.environmentKey),
        });
    } catch (error) {
        console.error("Failed to read env variables:", error);
        return json({ error: "Internal server error." }, 500);
    }
}

export async function PUT(request: Request, context: ProjectEnvFileRouteContext) {
    try {
        const session = await getRequestSession(request);

        if (!session?.user?.id) {
            return json({ error: "Unauthorized" }, 401);
        }

        const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

        if (limited) {
            return limited;
        }

        const { workspaceId, projectId, envFileId } = await context.params;

        if (!workspaceId || !projectId || !envFileId) {
            return json({ error: "Workspace id, project id, and env file id are required." }, 400);
        }

        const body = (await request
            .json()
            .catch(() => null)) as SaveEnvVariablesBody | null;

        if (!body) {
            return json({ error: "Invalid JSON payload." }, 400);
        }

        const parsed = parseSaveEnvVariablesBody(body);

        if ("error" in parsed) {
            return json({ error: parsed.error }, 400);
        }

        const result = await replaceEnvVariablesForFile({
            workspaceId,
            projectId,
            envFileId,
            userId: session.user.id,
            variables: parsed.value.variables,
            via: session.via === "cli" ? "cli" : undefined,
        });

        if (result.status === "NOT_FOUND") {
            return json({ error: "Env file not found or access denied." }, 404);
        }

        if (result.status === "FORBIDDEN") {
            return json({ error: "You do not have access to edit this env file." }, 403);
        }

        if (result.status === "NO_KEY") {
            return json({ error: "Nobody has shared this environment's key with you yet." }, 403);
        }

        if (result.status === "STALE_KEY") {
            return json({ error: "This environment's key was rotated. Reload and try again." }, 409);
        }

        if (result.status === "CONFLICT") {
            return json({ error: "Variable keys must be unique within this env file." }, 409);
        }

        return json({
            variables: result.variables.map(serializeProjectEnvVariableCipher),
        });
    } catch (error) {
        console.error("Failed to save env variables:", error);
        return json({ error: "Internal server error." }, 500);
    }
}
