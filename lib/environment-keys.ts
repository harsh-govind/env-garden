import "server-only";
import {
    SEALED_SECRET_BYTE_LENGTH,
    SIGNATURE_BYTE_LENGTH,
    environmentKeyIdPattern,
} from "@/constants/crypto";
import { isEnvironmentTypeValue } from "@/constants/environment";
import { decodeBase64Field } from "@/lib/crypto-payload";
import { verifyEnvironmentShare } from "@/lib/crypto/environment";
import type { NewEnvironmentKeyInput } from "@/types/project";
import type { EnvironmentTypeValue } from "@/types/workspace";

export function parseSealedShare(value: unknown) {
    if (!value || typeof value !== "object") {
        return null;
    }

    const share = value as Record<string, unknown>;
    const sealedSecret = decodeBase64Field(share.sealedSecret, SEALED_SECRET_BYTE_LENGTH);
    const signature = decodeBase64Field(share.signature, SIGNATURE_BYTE_LENGTH);

    return sealedSecret && signature ? { sealedSecret, signature } : null;
}

export function parseNewEnvironmentKey(
    value: unknown,
    environment?: EnvironmentTypeValue
): NewEnvironmentKeyInput | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const key = value as Record<string, unknown>;
    const share = parseSealedShare(key);
    const resolvedEnvironment = environment ?? key.environment;

    if (
        typeof key.id !== "string"
        || !environmentKeyIdPattern.test(key.id)
        || !share
        || !isEnvironmentTypeValue(resolvedEnvironment)
    ) {
        return null;
    }

    return {
        id: key.id,
        environment: resolvedEnvironment,
        ...share,
    };
}

export function parseNewEnvironmentKeys(value: unknown, environments: EnvironmentTypeValue[]) {
    if (!Array.isArray(value)) {
        return null;
    }

    const keys = value.map((item) => parseNewEnvironmentKey(item));

    if (keys.some((key) => key === null) || keys.length !== environments.length) {
        return null;
    }

    const parsed = keys as NewEnvironmentKeyInput[];
    const byEnvironment = new Map(parsed.map((key) => [key.environment, key]));
    const ids = new Set(parsed.map((key) => key.id));

    if (
        byEnvironment.size !== environments.length
        || ids.size !== parsed.length
        || environments.some((environment) => !byEnvironment.has(environment))
    ) {
        return null;
    }

    return parsed;
}

export function verifySelfShare(input: {
    key: Pick<NewEnvironmentKeyInput, "id" | "sealedSecret" | "signature">;
    version: number;
    userId: string;
    keyring: { signPublicKey: string; boxPublicKey: string };
}) {
    return verifyEnvironmentShare({
        share: {
            sealedSecret: input.key.sealedSecret,
            signature: input.key.signature,
        },
        context: {
            environmentKeyId: input.key.id,
            version: input.version,
            recipientUserId: input.userId,
            recipientBoxPublicKey: input.keyring.boxPublicKey,
        },
        signerSignPublicKey: input.keyring.signPublicKey,
    });
}
