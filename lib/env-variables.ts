import {
    ENV_VARIABLE_NOTE_MAX_LENGTH,
    MAX_ENV_VARIABLES_PER_SAVE,
    envKeyPattern,
} from "@/constants/environment";
import type { SaveEnvVariablesBody } from "@/types/project";

export function parseSaveEnvVariablesBody(body: SaveEnvVariablesBody) {
    if (!Array.isArray(body.variables)) {
        return { error: "Variables must be an array." };
    }

    if (body.variables.length > MAX_ENV_VARIABLES_PER_SAVE) {
        return { error: `You can save up to ${MAX_ENV_VARIABLES_PER_SAVE} variables at a time.` };
    }

    const seenKeys = new Set<string>();
    const variables: {
        id?: string;
        key: string;
        value?: string;
        note: string | null;
        isCommented: boolean;
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

        if (note.length > ENV_VARIABLE_NOTE_MAX_LENGTH) {
            return { error: `Note for ${key} must be ${ENV_VARIABLE_NOTE_MAX_LENGTH} characters or less.` };
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
            isCommented: variable.isCommented === true,
        });
    }

    return {
        value: {
            variables,
        },
    };
}
