import "server-only";
import {
    AEAD_OVERHEAD_BYTES,
    KEY_DIGEST_BYTE_LENGTH,
    MAX_UTF8_BYTES_PER_CHARACTER,
} from "@/constants/crypto";
import {
    ENV_VARIABLE_KEY_MAX_LENGTH,
    ENV_VARIABLE_NOTE_MAX_LENGTH,
    ENV_VARIABLE_VALUE_MAX_LENGTH,
    MAX_ENV_VARIABLES_PER_SAVE,
} from "@/constants/environment";
import { decodeBase64Field, decodeBase64FieldWithin } from "@/lib/crypto-payload";
import type { EncryptedVariable } from "@/types/crypto";
import type { SaveEnvVariablesBody } from "@/types/project";

const MAX_KEY_CIPHERTEXT_BYTES = ENV_VARIABLE_KEY_MAX_LENGTH + AEAD_OVERHEAD_BYTES;
const MAX_VALUE_CIPHERTEXT_BYTES =
    ENV_VARIABLE_VALUE_MAX_LENGTH * MAX_UTF8_BYTES_PER_CHARACTER + AEAD_OVERHEAD_BYTES;
const MAX_NOTE_CIPHERTEXT_BYTES =
    ENV_VARIABLE_NOTE_MAX_LENGTH * MAX_UTF8_BYTES_PER_CHARACTER + AEAD_OVERHEAD_BYTES;

export function parseSaveEnvVariablesBody(
    body: SaveEnvVariablesBody
): { value: { variables: EncryptedVariable[] } } | { error: string } {
    if (!Array.isArray(body.variables)) {
        return { error: "Variables must be an array." };
    }

    if (body.variables.length > MAX_ENV_VARIABLES_PER_SAVE) {
        return { error: `You can save up to ${MAX_ENV_VARIABLES_PER_SAVE} variables at a time.` };
    }

    const seenDigests = new Set<string>();
    const variables: EncryptedVariable[] = [];
    let keyVersion: number | null = null;

    for (const rawVariable of body.variables) {
        if (!rawVariable || typeof rawVariable !== "object") {
            return { error: "Each variable must be an object." };
        }

        const variable = rawVariable as Record<string, unknown>;
        const keyDigest = decodeBase64Field(variable.keyDigest, KEY_DIGEST_BYTE_LENGTH);
        const encryptedKey = decodeBase64FieldWithin(
            variable.encryptedKey,
            AEAD_OVERHEAD_BYTES + 1,
            MAX_KEY_CIPHERTEXT_BYTES
        );
        const encryptedValue = decodeBase64FieldWithin(
            variable.encryptedValue,
            AEAD_OVERHEAD_BYTES,
            MAX_VALUE_CIPHERTEXT_BYTES
        );
        const encryptedNote = variable.encryptedNote === null || variable.encryptedNote === undefined
            ? null
            : decodeBase64FieldWithin(
                variable.encryptedNote,
                AEAD_OVERHEAD_BYTES + 1,
                MAX_NOTE_CIPHERTEXT_BYTES
            );

        if (!keyDigest || !encryptedKey || !encryptedValue) {
            return { error: "Each variable must be encrypted before it is saved." };
        }

        if (variable.encryptedNote !== null && variable.encryptedNote !== undefined && !encryptedNote) {
            return { error: "Variable notes must be encrypted before they are saved." };
        }

        if (!Number.isInteger(variable.keyVersion) || (variable.keyVersion as number) < 1) {
            return { error: "Each variable needs a key version." };
        }

        if (keyVersion !== null && keyVersion !== variable.keyVersion) {
            return { error: "All variables must be encrypted with the same key version." };
        }

        if (typeof variable.isCommented !== "boolean") {
            return { error: "Each variable needs an isCommented flag." };
        }

        if (seenDigests.has(keyDigest)) {
            return { error: "Variable keys must be unique within this env file." };
        }

        keyVersion = variable.keyVersion as number;
        seenDigests.add(keyDigest);
        variables.push({
            keyDigest,
            encryptedKey,
            encryptedValue,
            encryptedNote,
            isCommented: variable.isCommented,
            keyVersion,
        });
    }

    return { value: { variables } };
}
