import "server-only";
import { randomBytes } from "crypto";
import {
    CLI_LOGIN_REQUEST_TTL_MS,
    CLI_POLL_SECRET_PREFIX,
    CLI_TOKEN_SECRET_BYTE_LENGTH,
} from "@/constants/cli";
import { hashCliToken } from "@/lib/cli/token";
import {
    approveCliLoginRequestRecord,
    createCliLoginRequestRecord,
    findCliLoginRequestForAuthorization,
    findCliLoginRequestForPolling,
} from "@/prisma/services/cli";
import type {
    ApproveCliLoginRequestInput,
    CreateCliLoginRequestInput,
    GetCliLoginRequestStatusInput,
} from "@/types/cli";

export async function createCliLoginRequest(
    input: CreateCliLoginRequestInput
) {
    const pollSecret = `${CLI_POLL_SECRET_PREFIX}${randomBytes(
        CLI_TOKEN_SECRET_BYTE_LENGTH
    ).toString("base64url")}`;
    const expiresAt = new Date(Date.now() + CLI_LOGIN_REQUEST_TTL_MS);
    const loginRequest = await createCliLoginRequestRecord({
        ...input,
        pollSecretHash: hashCliToken(pollSecret),
        expiresAt,
    });

    return {
        ...loginRequest,
        pollSecret,
    };
}

export function getCliLoginRequestForAuthorization(requestId: string) {
    return findCliLoginRequestForAuthorization(requestId);
}

export async function getCliLoginRequestStatus(
    input: GetCliLoginRequestStatusInput
) {
    const loginRequest = await findCliLoginRequestForPolling({
        requestId: input.requestId,
        pollSecretHash: hashCliToken(input.pollSecret),
    });

    if (!loginRequest) {
        return { status: "NOT_FOUND" as const };
    }

    if (loginRequest.approvedAt) {
        return { status: "APPROVED" as const, sealedPackage: loginRequest.sealedPackage };
    }

    if (loginRequest.expiresAt <= new Date()) {
        return { status: "EXPIRED" as const };
    }

    return { status: "PENDING" as const };
}

export function approveCliLoginRequest(input: ApproveCliLoginRequestInput) {
    return approveCliLoginRequestRecord(input);
}
