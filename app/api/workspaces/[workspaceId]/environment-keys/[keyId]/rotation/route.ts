import { NextResponse } from "next/server";
import { API_RATE_LIMIT } from "@/constants/rate-limit";
import { parseSaveEnvVariablesBody } from "@/lib/env-variables";
import { parseSealedShare } from "@/lib/environment-keys";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getRequestSession } from "@/lib/request-auth";
import {
    getRotationBundle,
    rotateEnvironmentKey,
} from "@/prisma/services/environment-key";
import {
    serializeProjectEnvironmentKey,
    serializeProjectEnvVariableCipher,
} from "@/utils/serializers/project";
import type {
    EnvironmentKeyRouteContext,
    RotateEnvironmentKeyBody,
    RotateEnvironmentKeyInput,
} from "@/types/environment-key";

const noStoreHeaders = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: noStoreHeaders });
}

async function authorize(request: Request) {
    const session = await getRequestSession(request);

    if (!session?.user?.id) {
        return { response: json({ error: "Unauthorized" }, 401) };
    }

    const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

    return limited ? { response: limited } : { userId: session.user.id };
}

function parseRotationBody(
    body: RotateEnvironmentKeyBody | null
): { value: RotateEnvironmentKeyInput } | { error: string } {
    if (!body || !Number.isInteger(body.expectedVersion)) {
        return { error: "Invalid rotation." };
    }

    if (!Array.isArray(body.shares) || body.shares.length === 0 || !Array.isArray(body.envFiles)) {
        return { error: "A rotation needs new key shares and re-encrypted env files." };
    }

    const shares: RotateEnvironmentKeyInput["shares"] = [];

    for (const rawShare of body.shares) {
        const share = parseSealedShare(rawShare);
        const userId = (rawShare as Record<string, unknown> | null)?.userId;

        if (!share || typeof userId !== "string") {
            return { error: "Invalid key share." };
        }

        shares.push({ userId, ...share });
    }

    const envFiles: RotateEnvironmentKeyInput["envFiles"] = [];

    for (const rawEnvFile of body.envFiles) {
        const envFile = rawEnvFile as Record<string, unknown> | null;

        if (
            !envFile
            || typeof envFile.id !== "string"
            || !Array.isArray(envFile.expectedVariableIds)
            || envFile.expectedVariableIds.some((id) => typeof id !== "string")
        ) {
            return { error: "Invalid env file in rotation." };
        }

        const parsed = parseSaveEnvVariablesBody({ variables: envFile.variables });

        if ("error" in parsed) {
            return { error: parsed.error };
        }

        envFiles.push({
            id: envFile.id,
            expectedVariableIds: envFile.expectedVariableIds as string[],
            variables: parsed.value.variables,
        });
    }

    return {
        value: {
            expectedVersion: body.expectedVersion as number,
            shares,
            envFiles,
        },
    };
}

export async function GET(request: Request, context: EnvironmentKeyRouteContext) {
    try {
        const auth = await authorize(request);

        if ("response" in auth) {
            return auth.response;
        }

        const { workspaceId, keyId } = await context.params;
        const result = await getRotationBundle({
            workspaceId,
            environmentKeyId: keyId,
            userId: auth.userId,
        });

        if (result.status === "NOT_FOUND") {
            return json({ error: "Environment key not found or access denied." }, 404);
        }

        if (result.status === "FORBIDDEN") {
            return json({ error: "Only members who can edit this environment can rotate its key." }, 403);
        }

        if (result.status === "NO_KEY") {
            return json({ error: "You don't hold this environment's key." }, 403);
        }

        return json({
            environmentKey: serializeProjectEnvironmentKey(result.environmentKey),
            envFiles: result.envFiles.map((envFile) => ({
                id: envFile.id,
                variables: envFile.variables.map(serializeProjectEnvVariableCipher),
            })),
            recipients: result.recipients,
        });
    } catch (error) {
        console.error("Failed to load rotation bundle:", error);
        return json({ error: "Internal server error." }, 500);
    }
}

export async function POST(request: Request, context: EnvironmentKeyRouteContext) {
    try {
        const auth = await authorize(request);

        if ("response" in auth) {
            return auth.response;
        }

        const { workspaceId, keyId } = await context.params;
        const body = (await request.json().catch(() => null)) as RotateEnvironmentKeyBody | null;
        const parsed = parseRotationBody(body);

        if ("error" in parsed) {
            return json({ error: parsed.error }, 400);
        }

        const result = await rotateEnvironmentKey({
            workspaceId,
            environmentKeyId: keyId,
            userId: auth.userId,
            rotation: parsed.value,
        });

        switch (result.status) {
            case "OK":
                return json({ version: result.version });
            case "NOT_FOUND":
                return json({ error: "Environment key not found or access denied." }, 404);
            case "FORBIDDEN":
                return json({ error: "Only members who can edit this environment can rotate its key." }, 403);
            case "NO_KEY":
                return json({ error: "You don't hold this environment's key." }, 403);
            case "STALE_KEY":
            case "CONFLICT":
                return json({ error: "Someone changed this environment while you were rotating. Try again." }, 409);
            case "INVALID_RECIPIENTS":
                return json({ error: "The new key must be shared with every current member." }, 400);
            case "INVALID_SHARE":
                return json({ error: "A key share signature is invalid." }, 400);
        }
    } catch (error) {
        console.error("Failed to rotate environment key:", error);
        return json({ error: "Internal server error." }, 500);
    }
}
