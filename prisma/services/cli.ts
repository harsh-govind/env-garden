import { prisma } from "@/lib/prisma";
import type {
    ApproveCliLoginRequestInput,
    AuthenticateCliTokenRecordInput,
    CreateCliLoginRequestRecordInput,
    FindCliLoginRequestForPollingInput,
} from "@/types/cli";

export async function createCliLoginRequestRecord(
    input: CreateCliLoginRequestRecordInput
) {
    return prisma.$transaction(async (tx) => {
        await tx.cliLoginRequest.deleteMany({
            where: {
                expiresAt: { lte: new Date() },
            },
        });

        return tx.cliLoginRequest.create({
            data: {
                tokenHash: input.tokenHash,
                tokenPrefix: input.tokenPrefix,
                tokenName: input.tokenName,
                pollSecretHash: input.pollSecretHash,
                expiresAt: input.expiresAt,
            },
            select: {
                id: true,
                expiresAt: true,
            },
        });
    });
}

export async function findCliLoginRequestForAuthorization(requestId: string) {
    return prisma.cliLoginRequest.findUnique({
        where: { id: requestId },
        select: {
            id: true,
            tokenName: true,
            expiresAt: true,
            approvedAt: true,
        },
    });
}

export async function findCliLoginRequestForPolling(
    input: FindCliLoginRequestForPollingInput
) {
    return prisma.cliLoginRequest.findFirst({
        where: {
            id: input.requestId,
            pollSecretHash: input.pollSecretHash,
        },
        select: {
            expiresAt: true,
            approvedAt: true,
        },
    });
}

export async function approveCliLoginRequestRecord(
    input: ApproveCliLoginRequestInput
) {
    const now = new Date();

    return prisma.$transaction(async (tx) => {
        const claimedRequest = await tx.cliLoginRequest.updateMany({
            where: {
                id: input.requestId,
                approvedAt: null,
                expiresAt: { gt: now },
            },
            data: {
                approvedAt: now,
                approvedById: input.userId,
            },
        });

        if (claimedRequest.count === 0) {
            const existingRequest = await tx.cliLoginRequest.findUnique({
                where: { id: input.requestId },
                select: {
                    approvedAt: true,
                },
            });

            if (!existingRequest) {
                return { status: "NOT_FOUND" as const };
            }

            if (existingRequest.approvedAt) {
                return { status: "ALREADY_APPROVED" as const };
            }

            return { status: "EXPIRED" as const };
        }

        const loginRequest = await tx.cliLoginRequest.findUniqueOrThrow({
            where: { id: input.requestId },
            select: {
                tokenHash: true,
                tokenPrefix: true,
                tokenName: true,
            },
        });

        await tx.cliToken.create({
            data: {
                userId: input.userId,
                name: loginRequest.tokenName,
                tokenPrefix: loginRequest.tokenPrefix,
                tokenHash: loginRequest.tokenHash,
            },
        });

        return { status: "OK" as const };
    });
}

export async function findAndTouchActiveCliToken(
    input: AuthenticateCliTokenRecordInput
) {
    return prisma.$transaction(async (tx) => {
        const cliToken = await tx.cliToken.findFirst({
            where: {
                tokenHash: input.tokenHash,
                revokedAt: null,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: input.usedAt } },
                ],
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        if (!cliToken) {
            return null;
        }

        await tx.cliToken.update({
            where: { id: cliToken.id },
            data: { lastUsedAt: input.usedAt },
        });

        return cliToken;
    });
}
