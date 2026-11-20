import { prisma } from "@/lib/prisma";
import { verifyEnvironmentShare } from "@/lib/crypto/environment";
import type { Prisma } from "@/prisma/generated/client";
import {
    canEditEnvironment,
    getProjectAccessContext,
    loadWorkspacePermissionIndex,
} from "@/prisma/services/project-access";
import {
    environmentKeySelect,
    getActorEmail,
    mapEnvironmentKeyRow,
    mapEnvVariableCipherRecord,
    variableCipherSelect,
} from "@/prisma/services/project";
import type {
    EnvironmentKeyAccess,
    KeyRecipient,
    RotateEnvironmentKeyInput,
} from "@/types/environment-key";
import type { CreateWorkspaceHistoryEntryInput, EnvironmentTypeValue } from "@/types/workspace";

type Tx = Prisma.TransactionClient;

const recipientSelect = {
    id: true,
    email: true,
    name: true,
    keyring: {
        select: {
            signPublicKey: true,
            boxPublicKey: true,
        },
    },
} as const;

function toRecipient(user: {
    id: string;
    email: string;
    name: string | null;
    keyring: { signPublicKey: string; boxPublicKey: string } | null;
}): KeyRecipient | null {
    return user.keyring
        ? {
            userId: user.id,
            email: user.email,
            name: user.name,
            signPublicKey: user.keyring.signPublicKey,
            boxPublicKey: user.keyring.boxPublicKey,
        }
        : null;
}

async function recordHistory(
    tx: Tx,
    input: {
        workspaceId: string;
        operation: string;
        message: string;
        data: Record<string, unknown>;
    }
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

export async function revokeUnpermittedShares(
    tx: Tx,
    input: { workspaceId: string; actorUserId: string }
) {
    const permissions = await loadWorkspacePermissionIndex(tx, input.workspaceId);
    const keys = await tx.environmentKey.findMany({
        where: { workspaceId: input.workspaceId },
        select: {
            id: true,
            projectId: true,
            environment: true,
            project: { select: { name: true } },
            shares: {
                select: {
                    id: true,
                    userId: true,
                    user: { select: { email: true } },
                },
            },
        },
    });
    const actorEmail = await getActorEmail(tx, input.actorUserId);

    for (const key of keys) {
        const revoked = key.shares.filter(
            (share) => !permissions.canAccess(share.userId, key.projectId, key.environment)
        );

        if (revoked.length === 0) {
            continue;
        }

        await tx.environmentKeyShare.deleteMany({
            where: { id: { in: revoked.map((share) => share.id) } },
        });
        await tx.environmentKey.update({
            where: { id: key.id },
            data: { rotationRequired: true },
        });
        await recordHistory(tx, {
            workspaceId: input.workspaceId,
            operation: "ENVIRONMENT_KEY_ACCESS_REVOKED",
            message: `${revoked.map((share) => share.user.email).join(", ")} lost the ${key.environment.toLowerCase()} key for project ${key.project.name}. The key must be rotated.`,
            data: {
                project: { id: key.projectId, name: key.project.name },
                environmentKey: { id: key.id, environment: key.environment },
                revokedUserIds: revoked.map((share) => share.userId),
                actor: { userId: input.actorUserId, email: actorEmail },
            },
        });
    }
}

export async function revokeAllSharesForUser(tx: Tx, userId: string) {
    const shares = await tx.environmentKeyShare.findMany({
        where: { userId },
        select: {
            id: true,
            environmentKey: {
                select: {
                    id: true,
                    workspaceId: true,
                    projectId: true,
                    environment: true,
                    project: { select: { name: true } },
                },
            },
        },
    });

    if (shares.length === 0) {
        return;
    }

    const actorEmail = await getActorEmail(tx, userId);

    await tx.environmentKeyShare.deleteMany({ where: { userId } });
    await tx.environmentKey.updateMany({
        where: { id: { in: shares.map((share) => share.environmentKey.id) } },
        data: { rotationRequired: true },
    });

    for (const share of shares) {
        await recordHistory(tx, {
            workspaceId: share.environmentKey.workspaceId,
            operation: "ENVIRONMENT_KEY_ACCESS_REVOKED",
            message: `${actorEmail} reset their encryption keys and lost the ${share.environmentKey.environment.toLowerCase()} key for project ${share.environmentKey.project.name}. The key must be rotated.`,
            data: {
                project: { id: share.environmentKey.projectId, name: share.environmentKey.project.name },
                environmentKey: { id: share.environmentKey.id, environment: share.environmentKey.environment },
                revokedUserIds: [userId],
                actor: { userId, email: actorEmail },
            },
        });
    }
}

export async function listEnvironmentKeyAccess(input: {
    workspaceId: string;
    userId: string;
    projectId?: string | null;
}): Promise<EnvironmentKeyAccess[] | null> {
    return prisma.$transaction(async (tx) => {
        const permissions = await loadWorkspacePermissionIndex(tx, input.workspaceId);

        if (!permissions.userIds.includes(input.userId)) {
            return null;
        }

        const keys = await tx.environmentKey.findMany({
            where: {
                workspaceId: input.workspaceId,
                ...(input.projectId ? { projectId: input.projectId } : {}),
            },
            orderBy: [{ projectId: "asc" }, { environment: "asc" }],
            select: {
                id: true,
                projectId: true,
                environment: true,
                version: true,
                rotationRequired: true,
                project: { select: { name: true } },
                shares: { select: { userId: true, version: true } },
            },
        });
        const users = await tx.user.findMany({
            where: { id: { in: permissions.userIds } },
            select: recipientSelect,
        });
        const accessible = keys.filter((key) =>
            permissions.canAccess(input.userId, key.projectId, key.environment)
        );
        const result: EnvironmentKeyAccess[] = [];

        for (const key of accessible) {
            const currentHolders = new Set(
                key.shares
                    .filter((share) => share.version === key.version)
                    .map((share) => share.userId)
            );
            const holdsKey = currentHolders.has(input.userId);
            const context = await getProjectAccessContext(tx, {
                workspaceId: input.workspaceId,
                projectId: key.projectId,
                userId: input.userId,
            });

            result.push({
                id: key.id,
                projectId: key.projectId,
                projectName: key.project.name,
                environment: key.environment as EnvironmentTypeValue,
                version: key.version,
                rotationRequired: key.rotationRequired,
                holdsKey,
                canRotate: holdsKey && Boolean(context && canEditEnvironment(context, key.environment)),
                holderCount: currentHolders.size,
                pendingRecipients: holdsKey
                    ? users
                        .filter(
                            (user) =>
                                !currentHolders.has(user.id)
                                && permissions.canAccess(user.id, key.projectId, key.environment)
                        )
                        .map(toRecipient)
                        .filter((recipient): recipient is KeyRecipient => recipient !== null)
                    : [],
            });
        }

        return result;
    });
}

async function lockEnvironmentKey(tx: Tx, input: { workspaceId: string; environmentKeyId: string }) {
    const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "EnvironmentKey"
        WHERE id = ${input.environmentKeyId} AND "workspaceId" = ${input.workspaceId}
        FOR UPDATE
    `;

    if (rows.length === 0) {
        return null;
    }

    return tx.environmentKey.findUnique({
        where: { id: input.environmentKeyId },
        select: {
            id: true,
            workspaceId: true,
            projectId: true,
            environment: true,
            version: true,
            project: { select: { name: true } },
            shares: { select: { userId: true, version: true } },
        },
    });
}

export async function grantEnvironmentKey(input: {
    workspaceId: string;
    environmentKeyId: string;
    granterUserId: string;
    recipientUserId: string;
    version: number;
    sealedSecret: string;
    signature: string;
}) {
    return prisma.$transaction(async (tx) => {
        const key = await lockEnvironmentKey(tx, input);

        if (!key) {
            return { status: "NOT_FOUND" as const };
        }

        const permissions = await loadWorkspacePermissionIndex(tx, input.workspaceId);

        if (!permissions.canAccess(input.granterUserId, key.projectId, key.environment)) {
            return { status: "NOT_FOUND" as const };
        }

        if (!key.shares.some((share) => share.userId === input.granterUserId && share.version === key.version)) {
            return { status: "NO_KEY" as const };
        }

        if (input.version !== key.version) {
            return { status: "STALE_KEY" as const };
        }

        if (!permissions.canAccess(input.recipientUserId, key.projectId, key.environment)) {
            return { status: "RECIPIENT_FORBIDDEN" as const };
        }

        const [granter, recipient] = await Promise.all([
            tx.userKeyring.findUnique({
                where: { userId: input.granterUserId },
                select: { signPublicKey: true },
            }),
            tx.user.findUnique({
                where: { id: input.recipientUserId },
                select: recipientSelect,
            }),
        ]);

        if (!granter || !recipient?.keyring) {
            return { status: "RECIPIENT_NO_KEYRING" as const };
        }

        const isValid = await verifyEnvironmentShare({
            share: { sealedSecret: input.sealedSecret, signature: input.signature },
            context: {
                environmentKeyId: key.id,
                version: key.version,
                recipientUserId: input.recipientUserId,
                recipientBoxPublicKey: recipient.keyring.boxPublicKey,
            },
            signerSignPublicKey: granter.signPublicKey,
        });

        if (!isValid) {
            return { status: "INVALID_SHARE" as const };
        }

        await tx.environmentKeyShare.upsert({
            where: {
                environmentKeyId_userId: {
                    environmentKeyId: key.id,
                    userId: input.recipientUserId,
                },
            },
            create: {
                environmentKeyId: key.id,
                userId: input.recipientUserId,
                version: key.version,
                recipientBoxPublicKey: recipient.keyring.boxPublicKey,
                sealedSecret: input.sealedSecret,
                signature: input.signature,
                grantedById: input.granterUserId,
                granterSignPublicKey: granter.signPublicKey,
            },
            update: {
                version: key.version,
                recipientBoxPublicKey: recipient.keyring.boxPublicKey,
                sealedSecret: input.sealedSecret,
                signature: input.signature,
                grantedById: input.granterUserId,
                granterSignPublicKey: granter.signPublicKey,
            },
        });

        const actorEmail = await getActorEmail(tx, input.granterUserId);

        await recordHistory(tx, {
            workspaceId: input.workspaceId,
            operation: "ENVIRONMENT_KEY_SHARED",
            message: `${actorEmail} shared the ${key.environment.toLowerCase()} key for project ${key.project.name} with ${recipient.email}.`,
            data: {
                project: { id: key.projectId, name: key.project.name },
                environmentKey: { id: key.id, environment: key.environment, version: key.version },
                recipient: { userId: recipient.id, email: recipient.email },
                actor: { userId: input.granterUserId, email: actorEmail },
            },
        });

        return { status: "OK" as const };
    });
}

async function getRotationScope(
    tx: Tx,
    input: { workspaceId: string; environmentKeyId: string; userId: string }
) {
    const key = await tx.environmentKey.findFirst({
        where: { id: input.environmentKeyId, workspaceId: input.workspaceId },
        select: { id: true, projectId: true, environment: true },
    });

    if (!key) {
        return null;
    }

    const context = await getProjectAccessContext(tx, {
        workspaceId: input.workspaceId,
        projectId: key.projectId,
        userId: input.userId,
    });

    if (!context) {
        return null;
    }

    return { key, canEdit: canEditEnvironment(context, key.environment) };
}

export async function getRotationBundle(input: {
    workspaceId: string;
    environmentKeyId: string;
    userId: string;
}) {
    return prisma.$transaction(async (tx) => {
        const scope = await getRotationScope(tx, input);

        if (!scope) {
            return { status: "NOT_FOUND" as const };
        }

        if (!scope.canEdit) {
            return { status: "FORBIDDEN" as const };
        }

        const keyRow = await tx.environmentKey.findUniqueOrThrow({
            where: { id: scope.key.id },
            select: environmentKeySelect(input.userId),
        });
        const environmentKey = mapEnvironmentKeyRow(keyRow);

        if (!environmentKey.share) {
            return { status: "NO_KEY" as const };
        }

        const permissions = await loadWorkspacePermissionIndex(tx, input.workspaceId);
        const holders = await tx.environmentKeyShare.findMany({
            where: { environmentKeyId: scope.key.id, version: environmentKey.version },
            select: { user: { select: recipientSelect } },
        });
        const envFiles = await tx.envFile.findMany({
            where: { projectId: scope.key.projectId, environment: scope.key.environment },
            orderBy: { id: "asc" },
            select: {
                id: true,
                variables: {
                    orderBy: [{ position: "asc" }, { id: "asc" }],
                    select: variableCipherSelect,
                },
            },
        });

        return {
            status: "OK" as const,
            environmentKey,
            envFiles: envFiles.map((envFile) => ({
                id: envFile.id,
                variables: envFile.variables.map(mapEnvVariableCipherRecord),
            })),
            recipients: holders
                .map((holder) => holder.user)
                .filter((user) => permissions.canAccess(user.id, scope.key.projectId, scope.key.environment))
                .map(toRecipient)
                .filter((recipient): recipient is KeyRecipient => recipient !== null),
        };
    });
}

export async function rotateEnvironmentKey(input: {
    workspaceId: string;
    environmentKeyId: string;
    userId: string;
    rotation: RotateEnvironmentKeyInput;
}) {
    return prisma.$transaction(async (tx) => {
        const scope = await getRotationScope(tx, input);

        if (!scope) {
            return { status: "NOT_FOUND" as const };
        }

        if (!scope.canEdit) {
            return { status: "FORBIDDEN" as const };
        }

        const envFiles = await tx.envFile.findMany({
            where: { projectId: scope.key.projectId, environment: scope.key.environment },
            select: { id: true },
        });
        const envFileIds = envFiles.map((envFile) => envFile.id);

        if (envFileIds.length > 0) {
            await tx.$queryRaw`SELECT id FROM "EnvFile" WHERE id = ANY(${envFileIds}) FOR UPDATE`;
        }

        const key = await lockEnvironmentKey(tx, input);

        if (!key) {
            return { status: "NOT_FOUND" as const };
        }

        if (key.version !== input.rotation.expectedVersion) {
            return { status: "STALE_KEY" as const };
        }

        if (!key.shares.some((share) => share.userId === input.userId && share.version === key.version)) {
            return { status: "NO_KEY" as const };
        }

        const nextVersion = key.version + 1;
        const submittedFiles = new Map(input.rotation.envFiles.map((envFile) => [envFile.id, envFile]));

        if (
            submittedFiles.size !== envFileIds.length
            || envFileIds.some((envFileId) => !submittedFiles.has(envFileId))
        ) {
            return { status: "CONFLICT" as const };
        }

        for (const envFileId of envFileIds) {
            const submitted = submittedFiles.get(envFileId)!;
            const current = await tx.envVariable.findMany({
                where: { envFileId },
                select: { id: true },
            });
            const currentIds = new Set(current.map((variable) => variable.id));

            if (
                currentIds.size !== submitted.expectedVariableIds.length
                || submitted.expectedVariableIds.some((id) => !currentIds.has(id))
                || submitted.variables.length !== submitted.expectedVariableIds.length
                || submitted.variables.some((variable) => variable.keyVersion !== nextVersion)
            ) {
                return { status: "CONFLICT" as const };
            }
        }

        const permissions = await loadWorkspacePermissionIndex(tx, input.workspaceId);
        const requiredRecipients = new Set(
            key.shares
                .filter((share) => share.version === key.version)
                .map((share) => share.userId)
                .filter((userId) => permissions.canAccess(userId, key.projectId, key.environment))
        );
        const shareUserIds = new Set(input.rotation.shares.map((share) => share.userId));

        if (
            shareUserIds.size !== input.rotation.shares.length
            || [...requiredRecipients].some((userId) => !shareUserIds.has(userId))
            || [...shareUserIds].some((userId) => !permissions.canAccess(userId, key.projectId, key.environment))
        ) {
            return { status: "INVALID_RECIPIENTS" as const };
        }

        const rotator = await tx.userKeyring.findUnique({
            where: { userId: input.userId },
            select: { signPublicKey: true },
        });
        const recipientKeyrings = await tx.userKeyring.findMany({
            where: { userId: { in: [...shareUserIds] } },
            select: { userId: true, boxPublicKey: true },
        });
        const boxKeyByUser = new Map(recipientKeyrings.map((keyring) => [keyring.userId, keyring.boxPublicKey]));

        if (!rotator || recipientKeyrings.length !== shareUserIds.size) {
            return { status: "INVALID_RECIPIENTS" as const };
        }

        for (const share of input.rotation.shares) {
            const isValid = await verifyEnvironmentShare({
                share: { sealedSecret: share.sealedSecret, signature: share.signature },
                context: {
                    environmentKeyId: key.id,
                    version: nextVersion,
                    recipientUserId: share.userId,
                    recipientBoxPublicKey: boxKeyByUser.get(share.userId)!,
                },
                signerSignPublicKey: rotator.signPublicKey,
            });

            if (!isValid) {
                return { status: "INVALID_SHARE" as const };
            }
        }

        await tx.environmentKeyShare.deleteMany({ where: { environmentKeyId: key.id } });
        await tx.environmentKeyShare.createMany({
            data: input.rotation.shares.map((share) => ({
                environmentKeyId: key.id,
                userId: share.userId,
                version: nextVersion,
                recipientBoxPublicKey: boxKeyByUser.get(share.userId)!,
                sealedSecret: share.sealedSecret,
                signature: share.signature,
                grantedById: input.userId,
                granterSignPublicKey: rotator.signPublicKey,
            })),
        });

        for (const envFileId of envFileIds) {
            const submitted = submittedFiles.get(envFileId)!;
            await tx.envVariable.deleteMany({ where: { envFileId } });

            if (submitted.variables.length > 0) {
                await tx.envVariable.createMany({
                    data: submitted.variables.map((variable, position) => ({
                        envFileId,
                        keyDigest: variable.keyDigest,
                        encryptedKey: variable.encryptedKey,
                        encryptedValue: variable.encryptedValue,
                        encryptedNote: variable.encryptedNote,
                        keyVersion: variable.keyVersion,
                        isCommented: variable.isCommented,
                        position,
                    })),
                });
            }
        }

        await tx.environmentKey.update({
            where: { id: key.id },
            data: { version: nextVersion, rotationRequired: false },
        });

        const actorEmail = await getActorEmail(tx, input.userId);

        await recordHistory(tx, {
            workspaceId: input.workspaceId,
            operation: "ENVIRONMENT_KEY_ROTATED",
            message: `${actorEmail} rotated the ${key.environment.toLowerCase()} key for project ${key.project.name} (version ${nextVersion}, ${shareUserIds.size} members).`,
            data: {
                project: { id: key.projectId, name: key.project.name },
                environmentKey: { id: key.id, environment: key.environment, version: nextVersion },
                recipientUserIds: [...shareUserIds],
                envFileIds,
                actor: { userId: input.userId, email: actorEmail },
            },
        });

        return { status: "OK" as const, version: nextVersion };
    });
}
