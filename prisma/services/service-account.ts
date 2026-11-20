import { randomBytes } from "node:crypto";
import { canManageWorkspaceMembers } from "@/constants/access";
import { SERVICE_ACCOUNT_EMAIL_DOMAIN } from "@/constants/service-account";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import {
    createProjectMembers,
    getActor,
    normalizeMemberAccess,
    validateProjectAccess,
} from "@/prisma/services/member";
import { getActorEmail } from "@/prisma/services/project";
import type { CreateServiceAccountInput, ServiceAccountSummary } from "@/types/service-account";
import type { CreateWorkspaceHistoryEntryInput, EnvironmentTypeValue } from "@/types/workspace";

type Tx = Prisma.TransactionClient;

function isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function requireManager(tx: Tx, workspaceId: string, userId: string) {
    const actor = await getActor(tx, { workspaceId, userId });
    return actor && canManageWorkspaceMembers(actor.role) ? actor : null;
}

async function recordHistory(
    tx: Tx,
    input: { workspaceId: string; operation: string; message: string; data: Record<string, unknown> }
) {
    await tx.workspaceHistory.create({
        data: {
            workspaceId: input.workspaceId,
            operation: input.operation,
            message: input.message,
            data: input.data as CreateWorkspaceHistoryEntryInput["data"],
        },
    });
}

export async function listServiceAccounts(input: {
    workspaceId: string;
    userId: string;
}): Promise<ServiceAccountSummary[] | null> {
    return prisma.$transaction(async (tx) => {
        if (!(await requireManager(tx, input.workspaceId, input.userId))) {
            return null;
        }

        const accounts = await tx.serviceAccount.findMany({
            where: { workspaceId: input.workspaceId },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                userId: true,
                name: true,
                createdAt: true,
                createdBy: { select: { email: true } },
                keyHolders: {
                    where: { userId: input.userId },
                    select: { sealedSeed: true },
                },
                user: {
                    select: {
                        keyring: { select: { signPublicKey: true, boxPublicKey: true } },
                        cliTokens: {
                            where: { revokedAt: null, expiresAt: { gt: new Date() } },
                            orderBy: { createdAt: "desc" },
                            select: {
                                id: true,
                                name: true,
                                tokenPrefix: true,
                                expiresAt: true,
                                lastUsedAt: true,
                                createdAt: true,
                            },
                        },
                        workspaceMemberships: {
                            where: { workspaceId: input.workspaceId },
                            select: {
                                projectMembers: {
                                    select: {
                                        projectId: true,
                                        role: true,
                                        environmentAccessScope: true,
                                        project: { select: { name: true } },
                                        envAccesses: { select: { environment: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return accounts
            .filter((account) => account.user.keyring)
            .map((account) => ({
                id: account.id,
                userId: account.userId,
                name: account.name,
                createdAt: account.createdAt.toISOString(),
                createdByEmail: account.createdBy?.email ?? null,
                signPublicKey: account.user.keyring!.signPublicKey,
                boxPublicKey: account.user.keyring!.boxPublicKey,
                sealedSeed: account.keyHolders[0]?.sealedSeed ?? null,
                projects: (account.user.workspaceMemberships[0]?.projectMembers ?? []).map((member) => ({
                    projectId: member.projectId,
                    projectName: member.project.name,
                    role: member.role,
                    environmentAccessScope: member.environmentAccessScope,
                    environments: member.envAccesses.map(
                        (access) => access.environment as EnvironmentTypeValue
                    ),
                })),
                tokens: account.user.cliTokens.map((token) => ({
                    id: token.id,
                    name: token.name,
                    tokenPrefix: token.tokenPrefix,
                    expiresAt: token.expiresAt?.toISOString() ?? null,
                    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
                    createdAt: token.createdAt.toISOString(),
                })),
            }));
    });
}

export async function createServiceAccount(input: CreateServiceAccountInput) {
    try {
        return await prisma.$transaction(async (tx) => {
            const actor = await requireManager(tx, input.workspaceId, input.actorUserId);

            if (!actor) {
                return { status: "FORBIDDEN" as const };
            }

            const actorKeyring = await tx.userKeyring.findUnique({
                where: { userId: input.actorUserId },
                select: { id: true },
            });

            if (!actorKeyring) {
                return { status: "KEYRING_REQUIRED" as const };
            }

            const access = normalizeMemberAccess({
                role: "MEMBER",
                projectAccessScope: "SELECTED_PROJECTS",
                defaultProjectRole: "VIEWER",
                defaultEnvironmentAccessScope: "ALL_ENVIRONMENTS",
                projects: input.projects,
            });
            const projectAccess = await validateProjectAccess(tx, input.workspaceId, access);

            if (projectAccess.status !== "OK") {
                return { status: "INVALID_ACCESS" as const };
            }

            const user = await tx.user.create({
                data: {
                    email: `sa-${randomBytes(12).toString("hex")}@${SERVICE_ACCOUNT_EMAIL_DOMAIN}`,
                    name: input.name,
                    emailVerified: false,
                    isServiceAccount: true,
                    keyring: {
                        create: {
                            signPublicKey: input.signPublicKey,
                            boxPublicKey: input.boxPublicKey,
                        },
                    },
                },
                select: { id: true },
            });
            const serviceAccount = await tx.serviceAccount.create({
                data: {
                    userId: user.id,
                    workspaceId: input.workspaceId,
                    name: input.name,
                    createdById: input.actorUserId,
                    keyHolders: {
                        create: {
                            userId: input.actorUserId,
                            sealedSeed: input.sealedSeed,
                        },
                    },
                },
                select: { id: true },
            });
            const member = await tx.workspaceMember.create({
                data: {
                    workspaceId: input.workspaceId,
                    userId: user.id,
                    role: access.role,
                    projectAccessScope: access.projectAccessScope,
                    defaultProjectRole: access.defaultProjectRole,
                    defaultEnvironmentAccessScope: access.defaultEnvironmentAccessScope,
                    addedById: input.actorUserId,
                },
                select: { id: true },
            });

            await createProjectMembers(tx, {
                workspaceId: input.workspaceId,
                workspaceMemberId: member.id,
                addedById: input.actorUserId,
                projects: projectAccess.projects,
            });

            const actorEmail = await getActorEmail(tx, input.actorUserId);

            await recordHistory(tx, {
                workspaceId: input.workspaceId,
                operation: "SERVICE_ACCOUNT_CREATED",
                message: `${actorEmail} created service account ${input.name}.`,
                data: {
                    serviceAccount: { id: serviceAccount.id, userId: user.id, name: input.name },
                    projects: projectAccess.projects,
                    actor: { userId: input.actorUserId, email: actorEmail },
                },
            });

            return { status: "OK" as const, serviceAccountId: serviceAccount.id, userId: user.id };
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { status: "CONFLICT" as const };
        }

        throw error;
    }
}

async function findServiceAccount(tx: Tx, workspaceId: string, serviceAccountId: string) {
    return tx.serviceAccount.findFirst({
        where: { id: serviceAccountId, workspaceId },
        select: { id: true, userId: true, name: true },
    });
}

export async function deleteServiceAccount(input: {
    workspaceId: string;
    actorUserId: string;
    serviceAccountId: string;
}) {
    return prisma.$transaction(async (tx) => {
        if (!(await requireManager(tx, input.workspaceId, input.actorUserId))) {
            return { status: "FORBIDDEN" as const };
        }

        const account = await findServiceAccount(tx, input.workspaceId, input.serviceAccountId);

        if (!account) {
            return { status: "NOT_FOUND" as const };
        }

        const shares = await tx.environmentKeyShare.findMany({
            where: { userId: account.userId },
            select: { environmentKeyId: true },
        });

        if (shares.length > 0) {
            await tx.environmentKey.updateMany({
                where: { id: { in: shares.map((share) => share.environmentKeyId) } },
                data: { rotationRequired: true },
            });
        }

        await tx.user.delete({ where: { id: account.userId } });

        const actorEmail = await getActorEmail(tx, input.actorUserId);

        await recordHistory(tx, {
            workspaceId: input.workspaceId,
            operation: "SERVICE_ACCOUNT_DELETED",
            message: `${actorEmail} deleted service account ${account.name}${shares.length > 0 ? `. ${shares.length} environment ${shares.length === 1 ? "key needs" : "keys need"} rotation` : ""}.`,
            data: {
                serviceAccount: { id: account.id, userId: account.userId, name: account.name },
                environmentKeyIds: shares.map((share) => share.environmentKeyId),
                actor: { userId: input.actorUserId, email: actorEmail },
            },
        });

        return { status: "OK" as const };
    });
}

export async function createServiceAccountToken(input: {
    workspaceId: string;
    actorUserId: string;
    serviceAccountId: string;
    name: string;
    tokenHash: string;
    tokenPrefix: string;
    encryptedServerShare: string;
    expiresAt: Date;
}) {
    try {
        return await prisma.$transaction(async (tx) => {
            if (!(await requireManager(tx, input.workspaceId, input.actorUserId))) {
                return { status: "FORBIDDEN" as const };
            }

            const account = await findServiceAccount(tx, input.workspaceId, input.serviceAccountId);

            if (!account) {
                return { status: "NOT_FOUND" as const };
            }

            const holder = await tx.serviceAccountKeyHolder.findUnique({
                where: {
                    serviceAccountId_userId: {
                        serviceAccountId: account.id,
                        userId: input.actorUserId,
                    },
                },
                select: { id: true },
            });

            if (!holder) {
                return { status: "NOT_HOLDER" as const };
            }

            const token = await tx.cliToken.create({
                data: {
                    userId: account.userId,
                    name: input.name,
                    tokenPrefix: input.tokenPrefix,
                    tokenHash: input.tokenHash,
                    encryptedServerShare: input.encryptedServerShare,
                    expiresAt: input.expiresAt,
                },
                select: { id: true },
            });
            const actorEmail = await getActorEmail(tx, input.actorUserId);

            await recordHistory(tx, {
                workspaceId: input.workspaceId,
                operation: "SERVICE_ACCOUNT_TOKEN_CREATED",
                message: `${actorEmail} created token "${input.name}" for service account ${account.name}.`,
                data: {
                    serviceAccount: { id: account.id, name: account.name },
                    token: { id: token.id, name: input.name, prefix: input.tokenPrefix, expiresAt: input.expiresAt.toISOString() },
                    actor: { userId: input.actorUserId, email: actorEmail },
                },
            });

            return { status: "OK" as const, tokenId: token.id };
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { status: "CONFLICT" as const };
        }

        throw error;
    }
}

export async function revokeServiceAccountToken(input: {
    workspaceId: string;
    actorUserId: string;
    serviceAccountId: string;
    tokenId: string;
}) {
    return prisma.$transaction(async (tx) => {
        if (!(await requireManager(tx, input.workspaceId, input.actorUserId))) {
            return { status: "FORBIDDEN" as const };
        }

        const account = await findServiceAccount(tx, input.workspaceId, input.serviceAccountId);

        if (!account) {
            return { status: "NOT_FOUND" as const };
        }

        const revoked = await tx.cliToken.updateMany({
            where: { id: input.tokenId, userId: account.userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });

        if (revoked.count === 0) {
            return { status: "NOT_FOUND" as const };
        }

        const actorEmail = await getActorEmail(tx, input.actorUserId);

        await recordHistory(tx, {
            workspaceId: input.workspaceId,
            operation: "SERVICE_ACCOUNT_TOKEN_REVOKED",
            message: `${actorEmail} revoked a token for service account ${account.name}.`,
            data: {
                serviceAccount: { id: account.id, name: account.name },
                token: { id: input.tokenId },
                actor: { userId: input.actorUserId, email: actorEmail },
            },
        });

        return { status: "OK" as const };
    });
}

export async function deleteServiceAccountUsersForWorkspace(tx: Tx, workspaceId: string) {
    const accounts = await tx.serviceAccount.findMany({
        where: { workspaceId },
        select: { userId: true },
    });

    if (accounts.length > 0) {
        await tx.user.deleteMany({
            where: { id: { in: accounts.map((account) => account.userId) }, isServiceAccount: true },
        });
    }
}
