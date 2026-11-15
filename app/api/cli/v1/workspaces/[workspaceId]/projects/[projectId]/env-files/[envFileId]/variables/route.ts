import { cliJson, withCliUser } from "@/lib/cli/route";
import { parseSaveEnvVariablesBody } from "@/lib/env-variables";
import {
    getEnvVariablesForFile,
    replaceEnvVariablesForFile,
} from "@/prisma/services/project";
import type { ProjectEnvFileRouteContext, SaveEnvVariablesBody } from "@/types/project";

type CliVariable = {
    key: string;
    value: string;
    note: string | null;
    isCommented: boolean;
};

/** Returns decrypted variables for `eit pull` / `eit run`. */
export async function GET(request: Request, context: ProjectEnvFileRouteContext) {
    return withCliUser(request, async (user) => {
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

        const variables: CliVariable[] = result.variables.map((variable) => ({
            key: variable.key,
            value: variable.value ?? "",
            note: variable.note,
            isCommented: variable.isCommented,
        }));

        return cliJson({ variables });
    });
}

/** Replaces all variables in the env file (`eit push`). */
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

        // The CLI always sends full values; ignore ids so the file is replaced as-is.
        const variables = parsed.value.variables.map((variable) => ({
            key: variable.key,
            value: variable.value,
            note: variable.note,
            isCommented: variable.isCommented,
        }));

        if (variables.some((variable) => typeof variable.value !== "string")) {
            return cliJson({ error: "Every variable needs a value." }, 400);
        }

        const result = await replaceEnvVariablesForFile({
            workspaceId,
            projectId,
            envFileId,
            userId: user.id,
            variables,
            via: "cli",
        });

        if (result.status === "NOT_FOUND") {
            return cliJson({ error: "Env file not found or access denied." }, 404);
        }

        if (result.status === "FORBIDDEN") {
            return cliJson({ error: "You do not have access to edit this env file." }, 403);
        }

        if (result.status === "CONFLICT") {
            return cliJson({ error: "Variable keys must be unique within this env file." }, 409);
        }

        return cliJson({ count: result.variables.length });
    });
}
