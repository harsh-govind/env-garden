import { REVEAL_RATE_LIMIT } from "@/constants/rate-limit";
import { cliJson, withCliUser } from "@/lib/cli/route";
import { rateLimitResponse } from "@/lib/rate-limit";
import { parseSaveEnvVariablesBody } from "@/lib/env-variables";
import {
    getEnvVariablesForFile,
    replaceEnvVariablesForFile,
} from "@/prisma/services/project";
import {
    serializeProjectEnvironmentKey,
    serializeProjectEnvVariableCipher,
} from "@/utils/serializers/project";
import type { ProjectEnvFileRouteContext, SaveEnvVariablesBody } from "@/types/project";

export async function GET(request: Request, context: ProjectEnvFileRouteContext) {
    return withCliUser(request, async (user) => {
        const revealLimited = await rateLimitResponse(REVEAL_RATE_LIMIT, user.id);

        if (revealLimited) {
            return revealLimited;
        }

        const { workspaceId, projectId, envFileId } = await context.params;
        const result = await getEnvVariablesForFile({
            workspaceId,
            projectId,
            envFileId,
            userId: user.id,
            via: "cli",
        });

        if (result.status === "NOT_FOUND") {
            return cliJson({ error: "Env file not found or access denied." }, 404);
        }

        if (result.status === "FORBIDDEN") {
            return cliJson({ error: "You do not have access to this env file." }, 403);
        }

        if (result.status === "NO_KEY") {
            return cliJson({ error: "Nobody has shared this environment's key with you yet." }, 403);
        }

        return cliJson({
            variables: result.variables.map(serializeProjectEnvVariableCipher),
            environmentKey: serializeProjectEnvironmentKey(result.environmentKey),
        });
    });
}

export async function PUT(request: Request, context: ProjectEnvFileRouteContext) {
    return withCliUser(request, async (user) => {
        const { workspaceId, projectId, envFileId } = await context.params;
        const body = (await request.json().catch(() => null)) as SaveEnvVariablesBody | null;

        if (!body) {
            return cliJson({ error: "Invalid JSON payload." }, 400);
        }

        const parsed = parseSaveEnvVariablesBody(body);

        if ("error" in parsed) {
            return cliJson({ error: parsed.error }, 400);
        }

        const result = await replaceEnvVariablesForFile({
            workspaceId,
            projectId,
            envFileId,
            userId: user.id,
            variables: parsed.value.variables,
            via: "cli",
        });

        if (result.status === "NOT_FOUND") {
            return cliJson({ error: "Env file not found or access denied." }, 404);
        }

        if (result.status === "FORBIDDEN") {
            return cliJson({ error: "You do not have access to edit this env file." }, 403);
        }

        if (result.status === "NO_KEY") {
            return cliJson({ error: "Nobody has shared this environment's key with you yet." }, 403);
        }

        if (result.status === "STALE_KEY") {
            return cliJson({ error: "This environment's key was rotated. Pull and try again." }, 409);
        }

        if (result.status === "CONFLICT") {
            return cliJson({ error: "Variable keys must be unique within this env file." }, 409);
        }

        return cliJson({ count: result.variables.length });
    });
}
