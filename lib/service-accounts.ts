import "server-only";
import { NextResponse } from "next/server";
import { cliTokenHashPattern, cliTokenVisiblePrefixPattern } from "@/constants/cli";
import { API_RATE_LIMIT } from "@/constants/rate-limit";
import {
    SEALED_SEED_BYTE_LENGTH,
    SERVICE_ACCOUNT_NAME_MAX_LENGTH,
    SERVICE_ACCOUNT_TOKEN_TTL_DAYS,
} from "@/constants/service-account";
import { decodeBase64Field } from "@/lib/crypto-payload";
import { parseMemberAccessBody } from "@/lib/member-access";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getRequestSession } from "@/lib/request-auth";
import type {
    CreateServiceAccountBody,
    CreateServiceAccountTokenBody,
} from "@/types/service-account";

const ENCRYPTED_SERVER_SHARE_BYTE_LENGTH = 24 + 32 + 16;

export function serviceAccountJson(body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function authorizeServiceAccountRequest(request: Request) {
    const session = await getRequestSession(request);

    if (!session?.user?.id) {
        return { response: serviceAccountJson({ error: "Unauthorized" }, 401) };
    }

    if (session.via !== "web") {
        return { response: serviceAccountJson({ error: "Manage service accounts from the browser." }, 403) };
    }

    const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

    return limited ? { response: limited } : { userId: session.user.id };
}

export function parseCreateServiceAccountBody(body: CreateServiceAccountBody | null) {
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const signPublicKey = decodeBase64Field(body?.signPublicKey, 32);
    const boxPublicKey = decodeBase64Field(body?.boxPublicKey, 32);
    const sealedSeed = decodeBase64Field(body?.sealedSeed, SEALED_SEED_BYTE_LENGTH);

    if (name.length < 2 || name.length > SERVICE_ACCOUNT_NAME_MAX_LENGTH) {
        return { error: `Name must be between 2 and ${SERVICE_ACCOUNT_NAME_MAX_LENGTH} characters.` };
    }

    if (!signPublicKey || !boxPublicKey || !sealedSeed) {
        return { error: "Create the service account's keys in your browser." };
    }

    const access = parseMemberAccessBody({
        role: "MEMBER",
        projectAccessScope: "SELECTED_PROJECTS",
        projects: body?.projects,
    });

    if ("error" in access) {
        return { error: access.error };
    }

    return {
        value: {
            name,
            signPublicKey,
            boxPublicKey,
            sealedSeed,
            projects: access.value.projects,
        },
    };
}

export function parseCreateServiceAccountTokenBody(body: CreateServiceAccountTokenBody | null) {
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const tokenHash = typeof body?.tokenHash === "string" ? body.tokenHash.trim().toLowerCase() : "";
    const tokenPrefix = typeof body?.tokenPrefix === "string" ? body.tokenPrefix.trim() : "";
    const encryptedServerShare = decodeBase64Field(
        body?.encryptedServerShare,
        ENCRYPTED_SERVER_SHARE_BYTE_LENGTH
    );
    const expiresInDays = body?.expiresInDays;

    if (name.length < 1 || name.length > SERVICE_ACCOUNT_NAME_MAX_LENGTH) {
        return { error: `Token name must be between 1 and ${SERVICE_ACCOUNT_NAME_MAX_LENGTH} characters.` };
    }

    if (!cliTokenHashPattern.test(tokenHash) || !cliTokenVisiblePrefixPattern.test(tokenPrefix) || !encryptedServerShare) {
        return { error: "Create the token in your browser." };
    }

    if (!(SERVICE_ACCOUNT_TOKEN_TTL_DAYS as readonly unknown[]).includes(expiresInDays)) {
        return { error: `Token lifetime must be one of ${SERVICE_ACCOUNT_TOKEN_TTL_DAYS.join(", ")} days.` };
    }

    return {
        value: {
            name,
            tokenHash,
            tokenPrefix,
            encryptedServerShare,
            expiresAt: new Date(Date.now() + (expiresInDays as number) * 24 * 60 * 60 * 1000),
        },
    };
}
