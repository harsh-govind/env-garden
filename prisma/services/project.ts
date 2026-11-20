import { prisma } from "@/lib/prisma";
import {
    environmentTypeLabels,
    formatEnvironmentFileName,
} from "@/constants/environment";
import { verifySelfShare } from "@/lib/environment-keys";
import {
    canEditEnvironment,
    canManageProject,
    getProjectAccessContext,
    hasEnvironmentAccess,
} from "@/prisma/services/project-access";
import { Prisma } from "@/prisma/generated/client";
import type { EncryptedVariable } from "@/types/crypto";
import type {
    NewEnvironmentKeyInput,
    ProjectDetailRecord,
    ProjectEnvFileRecord,
    ProjectEnvVariableCipherRecord,
    ProjectEnvironmentKeyRecord,
} from "@/types/project";
import type {
    CreateWorkspaceHistoryEntryInput,
    EnvironmentTypeValue,
} from "@/types/workspace";

function formatUserEmail(email: string | null | undefined, userId: string) {
    return email ?? `user:${userId}`;
}

export async function getActorEmail(tx: Prisma.TransactionClient, userId: string) {
    const actor = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });

    return formatUserEmail(actor?.email, userId);
}

function formatEnvironmentLabels(environments: EnvironmentTypeValue[]) {
    return environments
        .map((environment) => environmentTypeLabels[environment])
        .join(", ");
}

function isUniqueConstraintError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    );
}

export const variableCipherSelect = {
    id: true,
    keyDigest: true,
    encryptedKey: true,
    encryptedValue: true,
    encryptedNote: true,
    keyVersion: true,
    isCommented: true,
    position: true,
    createdAt: true,
    updatedAt: true,
} as const;

const envFileSelect = {
    id: true,
    name: true,
    environment: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    variables: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: variableCipherSelect,
    },
} satisfies Prisma.EnvFileSelect;

export function environmentKeySelect(userId: string) {
    return {
        id: true,
        environment: true,
        version: true,
        rotationRequired: true,
        shares: {
            where: { userId },
            select: {
                version: true,
                recipientBoxPublicKey: true,
                sealedSecret: true,
                signature: true,
                granterSignPublicKey: true,
                grantedBy: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
        },
    } satisfies Prisma.EnvironmentKeySelect;
}

type EnvironmentKeyRow = Prisma.EnvironmentKeyGetPayload<{
    select: ReturnType<typeof environmentKeySelect>;
}>;

export function mapEnvironmentKeyRow(row: EnvironmentKeyRow): ProjectEnvironmentKeyRecord {
    const share = row.shares.find((candidate) => candidate.version === row.version) ?? null;

    return {
        id: row.id,
        environment: row.environment as EnvironmentTypeValue,
        version: row.version,
        rotationRequired: row.rotationRequired,
        share: share
            ? {
                version: share.version,
                recipientBoxPublicKey: share.recipientBoxPublicKey,
                sealedSecret: share.sealedSecret,
                signature: share.signature,
                granter: {
                    userId: share.grantedBy?.id ?? null,
                    email: share.grantedBy?.email ?? null,
                    signPublicKey: share.granterSignPublicKey,
                },
            }
            : null,
    };
}

async function getEnvironmentKeyForUser(
    tx: Prisma.TransactionClient,
    input: { projectId: string; environment: string; userId: string }
) {
    const row = await tx.environmentKey.findUnique({
        where: {
            projectId_environment: {
                projectId: input.projectId,
                environment: input.environment,
            },
        },
        select: environmentKeySelect(input.userId),
    });

    return row ? mapEnvironmentKeyRow(row) : null;
}

async function getKeyringForUserInTransaction(tx: Prisma.TransactionClient, userId: string) {
    return tx.userKeyring.findUnique({
        where: { userId },
        select: {
            signPublicKey: true,
            boxPublicKey: true,
        },
    });
}

async function createEnvironmentKeyWithSelfShare(
    tx: Prisma.TransactionClient,
    input: {
        workspaceId: string;
        projectId: string;
        userId: string;
        key: NewEnvironmentKeyInput;
        keyring: { signPublicKey: string; boxPublicKey: string };
    }
) {
    await tx.environmentKey.create({
        data: {
            id: input.key.id,
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            environment: input.key.environment,
            version: 1,
            createdById: input.userId,
            shares: {
                create: {
                    userId: input.userId,
                    version: 1,
                    recipientBoxPublicKey: input.keyring.boxPublicKey,
                    sealedSecret: input.key.sealedSecret,
                    signature: input.key.signature,
                    grantedById: input.userId,
                    granterSignPublicKey: input.keyring.signPublicKey,
                },
            },
        },
    });
}

export function mapEnvVariableCipherRecord(
    input: ProjectEnvVariableCipherRecord
): ProjectEnvVariableCipherRecord {
    return {
        id: input.id,
        keyDigest: input.keyDigest,
        encryptedKey: input.encryptedKey,
        encryptedValue: input.encryptedValue,
        encryptedNote: input.encryptedNote,
        keyVersion: input.keyVersion,
        isCommented: input.isCommented,
        position: input.position,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
    };
}

function mapEnvFileRecord(input: {
    id: string;
    name: string;
    environment: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    variables: ProjectEnvVariableCipherRecord[];
}): ProjectEnvFileRecord {
    return {
        id: input.id,
        name: input.name,
        environment: input.environment as EnvironmentTypeValue,
        description: input.description,
        variableCount: input.variables.length,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        variables: input.variables.map(mapEnvVariableCipherRecord),
    };
}

function isSameCiphertext(left: EncryptedVariable, right: EncryptedVariable) {
    return (
        left.encryptedKey === right.encryptedKey
        && left.encryptedValue === right.encryptedValue
        && left.encryptedNote === right.encryptedNote
        && left.isCommented === right.isCommented
        && left.keyVersion === right.keyVersion
    );
}

export async function createProjectForWorkspace(
    input: {
        workspaceId: string;
        userId: string;
        name: string;
        description?: string | null;
        environments: EnvironmentTypeValue[];
        environmentKeys: NewEnvironmentKeyInput[];
    }
) {
    const name = input.name.trim();
    const description = input.description?.trim() || null;
    const environments = Array.from(new Set(input.environments));

    try {
        return await prisma.$transaction(async (tx) => {
            const member = await tx.workspaceMember.findFirst({
                where: {
                    workspaceId: input.workspaceId,
                    userId: input.userId,
                },
                select: {
                    id: true,
                },
            });

            if (!member) {
                return { status: "NOT_FOUND" as const };
            }

            const keyring = await getKeyringForUserInTransaction(tx, input.userId);

            if (!keyring) {
                return { status: "KEYRING_REQUIRED" as const };
            }

            for (const key of input.environmentKeys) {
                const isValid = await verifySelfShare({ key, version: 1, userId: input.userId, keyring });

                if (!isValid) {
                    return { status: "INVALID_KEY" as const };
                }
            }

            const creator = await tx.user.findUnique({
                where: { id: input.userId },
                select: { email: true },
            });

            const creatorEmail = formatUserEmail(creator?.email, input.userId);

            const createdProject = await tx.project.create({
                data: {
                    workspaceId: input.workspaceId,
                    name,
                    description,
                    createdById: input.userId,
                },
            });

            for (const key of input.environmentKeys) {
                await createEnvironmentKeyWithSelfShare(tx, {
                    workspaceId: input.workspaceId,
                    projectId: createdProject.id,
                    userId: input.userId,
                    key,
                    keyring,
                });
            }

            const createdProjectMember = await tx.projectMember.create({
                data: {
                    workspaceId: input.workspaceId,
                    projectId: createdProject.id,
                    workspaceMemberId: member.id,
                    role: "OWNER",
                    environmentAccessScope: "ALL_ENVIRONMENTS",
                    addedById: input.userId,
                },
            });

            const createdEnvFiles = await Promise.all(
                environments.map((environment) =>
                    tx.envFile.create({
                        data: {
                            workspaceId: input.workspaceId,
                            projectId: createdProject.id,
                            name: formatEnvironmentFileName(environment),
                            environment,
                            description: `${environmentTypeLabels[environment]} environment variables for ${createdProject.name}.`,
                            createdById: input.userId,
                        },
                        select: {
                            id: true,
                            name: true,
                            environment: true,
                        },
                    })
                )
            );

            const createdEnvAccesses = await Promise.all(
                environments.map((environment) =>
                    tx.projectEnvAccess.create({
                        data: {
                            workspaceId: input.workspaceId,
                            projectId: createdProject.id,
                            projectMemberId: createdProjectMember.id,
                            environment,
                            grantedById: input.userId,
                        },
                        select: {
                            id: true,
                            environment: true,
                        },
                    })
                )
            );

            await tx.workspaceHistory.create({
                data: {
                    workspaceId: input.workspaceId,
                    operation: "PROJECT_CREATED",
                    message: `Project \"${createdProject.name}\" was created by ${creatorEmail}.`,
                    data: {
                        project: {
                            id: createdProject.id,
                            name: createdProject.name,
                        },
                        actor: {
                            userId: input.userId,
                            email: creatorEmail,
                        },
                        hasDescription: Boolean(description),
                    } as CreateWorkspaceHistoryEntryInput["data"],
                },
            });

            await tx.workspaceHistory.create({
                data: {
                    workspaceId: input.workspaceId,
                    operation: "PROJECT_ENVIRONMENTS_CREATED",
                    message: `${environments.length} environment files (${formatEnvironmentLabels(
                        environments
                    )}) were created for project ${createdProject.name}.`,
                    data: {
                        project: {
                            id: createdProject.id,
                            name: createdProject.name,
                        },
                        actor: {
                            userId: input.userId,
                            email: creatorEmail,
                        },
                        envFiles: createdEnvFiles.map((envFile) => ({
                            id: envFile.id,
                            name: envFile.name,
                            environment: envFile.environment,
                        })),
                        projectMember: {
                            id: createdProjectMember.id,
                        },
                        projectEnvAccesses: createdEnvAccesses.map((envAccess) => ({
                            id: envAccess.id,
                            environment: envAccess.environment,
                        })),
                    } as CreateWorkspaceHistoryEntryInput["data"],
                },
            });

            await tx.workspaceHistory.create({
                data: {
                    workspaceId: input.workspaceId,
                    operation: "PROJECT_MEMBER_ADDED",
                    message: `${creatorEmail} was added by ${creatorEmail} as OWNER for project ${createdProject.name}.`,
                    data: {
                        project: {
                            id: createdProject.id,
                            name: createdProject.name,
                        },
                        target: {
                            userId: input.userId,
                            email: creatorEmail,
                            workspaceMemberId: member.id,
                            projectMemberId: createdProjectMember.id,
                        },
                        role: "OWNER",
                        actor: {
                            userId: input.userId,
                            email: creatorEmail,
                        },
                    } as CreateWorkspaceHistoryEntryInput["data"],
                },
            });

            return {
                status: "OK" as const,
                envFileCount: environments.length,
                project: createdProject,
            };
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { status: "CONFLICT" as const };
        }

        throw error;
    }
}

export async function getProjectDetailForUser(input: {
    workspaceId: string;
    projectId: string;
    userId: string;
}): Promise<ProjectDetailRecord | null> {
    return prisma.$transaction(async (tx) => {
        const access = await getProjectAccessContext(tx, input);

        if (!access) {
            return null;
        }

        const project = await tx.project.findFirst({
            where: {
                id: input.projectId,
                workspaceId: input.workspaceId,
            },
            select: {
                id: true,
                workspaceId: true,
                name: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                envFiles: {
                    orderBy: [
                        {
                            environment: "asc",
                        },
                        {
                            name: "asc",
                        },
                    ],
                    select: envFileSelect,
                },
                environmentKeys: {
                    select: environmentKeySelect(input.userId),
                },
            },
        });

        if (!project) {
            return null;
        }

        const accessibleEnvFiles = project.envFiles.filter((envFile) =>
            hasEnvironmentAccess(access, envFile.environment)
        );
        const accessibleEnvironmentKeys = project.environmentKeys.filter((key) =>
            hasEnvironmentAccess(access, key.environment)
        );

        return {
            id: project.id,
            workspaceId: project.workspaceId,
            name: project.name,
            description: project.description,
            role: access.projectRole,
            canManage: canManageProject(access),
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            envFiles: accessibleEnvFiles.map(mapEnvFileRecord),
            environmentKeys: accessibleEnvironmentKeys.map(mapEnvironmentKeyRow),
        };
    });
}

export async function renameProject(input: {
    workspaceId: string;
    projectId: string;
    userId: string;
    name: string;
}): Promise<
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
    | { status: "INVALID_NAME" }
    | { status: "OK"; project: { id: string; name: string; updatedAt: Date } }
> {
    const name = input.name.trim();

    if (name.length < 2 || name.length > 80) {
        return {
            status: "INVALID_NAME" as const,
        };
    }

    return prisma.$transaction(async (tx) => {
        const access = await getProjectAccessContext(tx, input);

        if (!access) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        if (!canManageProject(access)) {
            return {
                status: "FORBIDDEN" as const,
            };
        }

        const previousName = access.project.name;

        if (previousName === name) {
            const current = await tx.project.findFirstOrThrow({
                where: {
                    id: input.projectId,
                    workspaceId: input.workspaceId,
                },
                select: {
                    id: true,
                    name: true,
                    updatedAt: true,
                },
            });

            return {
                status: "OK" as const,
                project: current,
            };
        }

        const actorEmail = await getActorEmail(tx, input.userId);

        const updatedProject = await tx.project.update({
            where: {
                id: input.projectId,
                workspaceId: input.workspaceId,
            },
            data: {
                name,
            },
            select: {
                id: true,
                name: true,
                updatedAt: true,
            },
        });

        await tx.workspaceHistory.create({
            data: {
                workspaceId: input.workspaceId,
                operation: "PROJECT_RENAMED",
                message: `${actorEmail} renamed project "${previousName}" to "${updatedProject.name}".`,
                data: {
                    project: {
                        id: updatedProject.id,
                        name: updatedProject.name,
                    },
                    previousName,
                    actor: {
                        userId: input.userId,
                        email: actorEmail,
                    },
                } as CreateWorkspaceHistoryEntryInput["data"],
            },
        });

        return {
            status: "OK" as const,
            project: updatedProject,
        };
    });
}

export async function deleteProject(input: {
    workspaceId: string;
    projectId: string;
    userId: string;
}): Promise<
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
    | { status: "OK" }
> {
    return prisma.$transaction(async (tx) => {
        const access = await getProjectAccessContext(tx, input);

        if (!access) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        if (!canManageProject(access)) {
            return {
                status: "FORBIDDEN" as const,
            };
        }

        const actorEmail = await getActorEmail(tx, input.userId);
        const envFileCount = await tx.envFile.count({
            where: {
                workspaceId: input.workspaceId,
                projectId: input.projectId,
            },
        });

        const deleted = await tx.project.deleteMany({
            where: {
                id: input.projectId,
                workspaceId: input.workspaceId,
            },
        });

        if (deleted.count === 0) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        await tx.workspaceHistory.create({
            data: {
                workspaceId: input.workspaceId,
                operation: "PROJECT_DELETED",
                message: `${actorEmail} deleted project "${access.project.name}".`,
                data: {
                    project: {
                        id: input.projectId,
                        name: access.project.name,
                    },
                    deletedEnvFileCount: envFileCount,
                    actor: {
                        userId: input.userId,
                        email: actorEmail,
                    },
                } as CreateWorkspaceHistoryEntryInput["data"],
            },
        });

        return {
            status: "OK" as const,
        };
    });
}

export async function createEnvFileForProject(input: {
    workspaceId: string;
    projectId: string;
    userId: string;
    name?: string | null;
    environment: EnvironmentTypeValue;
    description?: string | null;
    environmentKey?: NewEnvironmentKeyInput | null;
}) {
    try {
        return await prisma.$transaction(async (tx) => {
            const access = await getProjectAccessContext(tx, input);

            if (!access) {
                return {
                    status: "NOT_FOUND" as const,
                };
            }

            if (!canManageProject(access)) {
                return {
                    status: "FORBIDDEN" as const,
                };
            }

            const name =
                input.name?.trim() || formatEnvironmentFileName(input.environment);
            const description = input.description?.trim() || null;

            const existingEnvFile = await tx.envFile.findFirst({
                where: {
                    projectId: input.projectId,
                    name,
                },
                select: {
                    id: true,
                },
            });

            if (existingEnvFile) {
                return {
                    status: "CONFLICT" as const,
                };
            }

            const existingEnvironmentKey = await tx.environmentKey.findUnique({
                where: {
                    projectId_environment: {
                        projectId: input.projectId,
                        environment: input.environment,
                    },
                },
                select: { id: true },
            });

            if (!existingEnvironmentKey) {
                if (!input.environmentKey) {
                    return {
                        status: "KEY_REQUIRED" as const,
                    };
                }

                const keyring = await getKeyringForUserInTransaction(tx, input.userId);

                if (!keyring) {
                    return {
                        status: "KEYRING_REQUIRED" as const,
                    };
                }

                const isValid = await verifySelfShare({
                    key: input.environmentKey,
                    version: 1,
                    userId: input.userId,
                    keyring,
                });

                if (!isValid) {
                    return {
                        status: "INVALID_KEY" as const,
                    };
                }

                await createEnvironmentKeyWithSelfShare(tx, {
                    workspaceId: input.workspaceId,
                    projectId: input.projectId,
                    userId: input.userId,
                    key: { ...input.environmentKey, environment: input.environment },
                    keyring,
                });
            }

            const creator = await tx.user.findUnique({
                where: { id: input.userId },
                select: { email: true },
            });
            const creatorEmail = formatUserEmail(creator?.email, input.userId);

            const envFile = await tx.envFile.create({
                data: {
                    workspaceId: input.workspaceId,
                    projectId: input.projectId,
                    name,
                    environment: input.environment,
                    description,
                    createdById: input.userId,
                },
                select: envFileSelect,
            });

            const envAccess = access.projectMember
                ? await tx.projectEnvAccess.upsert({
                    where: {
                        projectMemberId_environment: {
                            projectMemberId: access.projectMember.id,
                            environment: input.environment,
                        },
                    },
                    update: {
                        grantedById: input.userId,
                    },
                    create: {
                        workspaceId: input.workspaceId,
                        projectId: input.projectId,
                        projectMemberId: access.projectMember.id,
                        environment: input.environment,
                        grantedById: input.userId,
                    },
                    select: {
                        id: true,
                        projectMemberId: true,
                        environment: true,
                    },
                })
                : null;

            await tx.workspaceHistory.create({
                data: {
                    workspaceId: input.workspaceId,
                    operation: "PROJECT_ENV_FILE_CREATED",
                    message: `${creatorEmail} created ${envFile.name} for project ${access.project.name}.`,
                    data: {
                        project: {
                            id: input.projectId,
                            name: access.project.name,
                        },
                        envFile: {
                            id: envFile.id,
                            name: envFile.name,
                            environment: envFile.environment,
                        },
                        actor: {
                            userId: input.userId,
                            email: creatorEmail,
                        },
                        ...(envAccess
                            ? {
                                projectEnvAccess: {
                                    id: envAccess.id,
                                    projectMemberId: envAccess.projectMemberId,
                                    environment: envAccess.environment,
                                },
                            }
                            : {}),
                    } as CreateWorkspaceHistoryEntryInput["data"],
                },
            });

            return {
                status: "OK" as const,
                envFile: mapEnvFileRecord(envFile),
                environmentKey: await getEnvironmentKeyForUser(tx, {
                    projectId: input.projectId,
                    environment: input.environment,
                    userId: input.userId,
                }),
            };
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return {
                status: "CONFLICT" as const,
            };
        }

        throw error;
    }
}

export async function renameEnvFile(input: {
    workspaceId: string;
    projectId: string;
    envFileId: string;
    userId: string;
    name: string;
}): Promise<
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
    | { status: "INVALID_NAME" }
    | { status: "CONFLICT" }
    | { status: "OK"; envFile: ProjectEnvFileRecord }
> {
    const name = input.name.trim();

    if (name.length === 0 || name.length > 120) {
        return {
            status: "INVALID_NAME" as const,
        };
    }

    try {
        return await prisma.$transaction(async (tx) => {
            const access = await getProjectAccessContext(tx, input);

            if (!access) {
                return {
                    status: "NOT_FOUND" as const,
                };
            }

            if (!canManageProject(access)) {
                return {
                    status: "FORBIDDEN" as const,
                };
            }

            const envFile = await tx.envFile.findFirst({
                where: {
                    id: input.envFileId,
                    workspaceId: input.workspaceId,
                    projectId: input.projectId,
                },
                select: {
                    id: true,
                    name: true,
                },
            });

            if (!envFile) {
                return {
                    status: "NOT_FOUND" as const,
                };
            }

            const previousName = envFile.name;

            if (previousName === name) {
                const current = await tx.envFile.findFirstOrThrow({
                    where: {
                        id: input.envFileId,
                        workspaceId: input.workspaceId,
                        projectId: input.projectId,
                    },
                    select: envFileSelect,
                });

                return {
                    status: "OK" as const,
                    envFile: mapEnvFileRecord(current),
                };
            }

            const conflictingEnvFile = await tx.envFile.findFirst({
                where: {
                    projectId: input.projectId,
                    name,
                },
                select: {
                    id: true,
                },
            });

            if (conflictingEnvFile) {
                return {
                    status: "CONFLICT" as const,
                };
            }

            const actorEmail = await getActorEmail(tx, input.userId);

            const updatedEnvFile = await tx.envFile.update({
                where: {
                    id: input.envFileId,
                },
                data: {
                    name,
                },
                select: envFileSelect,
            });

            await tx.workspaceHistory.create({
                data: {
                    workspaceId: input.workspaceId,
                    operation: "PROJECT_ENV_FILE_RENAMED",
                    message: `${actorEmail} renamed env file "${previousName}" to "${updatedEnvFile.name}" for project ${access.project.name}.`,
                    data: {
                        project: {
                            id: input.projectId,
                            name: access.project.name,
                        },
                        envFile: {
                            id: updatedEnvFile.id,
                            name: updatedEnvFile.name,
                            environment: updatedEnvFile.environment,
                        },
                        previousName,
                        actor: {
                            userId: input.userId,
                            email: actorEmail,
                        },
                    } as CreateWorkspaceHistoryEntryInput["data"],
                },
            });

            return {
                status: "OK" as const,
                envFile: mapEnvFileRecord(updatedEnvFile),
            };
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return {
                status: "CONFLICT" as const,
            };
        }

        throw error;
    }
}

export async function deleteEnvFile(input: {
    workspaceId: string;
    projectId: string;
    envFileId: string;
    userId: string;
}): Promise<
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
    | { status: "OK" }
> {
    return prisma.$transaction(async (tx) => {
        const access = await getProjectAccessContext(tx, input);

        if (!access) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        if (!canManageProject(access)) {
            return {
                status: "FORBIDDEN" as const,
            };
        }

        const envFile = await tx.envFile.findFirst({
            where: {
                id: input.envFileId,
                workspaceId: input.workspaceId,
                projectId: input.projectId,
            },
            select: {
                id: true,
                name: true,
                environment: true,
                _count: {
                    select: {
                        variables: true,
                    },
                },
            },
        });

        if (!envFile) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        const actorEmail = await getActorEmail(tx, input.userId);

        await tx.envFile.delete({
            where: {
                id: input.envFileId,
            },
        });

        await tx.workspaceHistory.create({
            data: {
                workspaceId: input.workspaceId,
                operation: "PROJECT_ENV_FILE_DELETED",
                message: `${actorEmail} deleted env file "${envFile.name}" from project ${access.project.name}.`,
                data: {
                    project: {
                        id: input.projectId,
                        name: access.project.name,
                    },
                    envFile: {
                        id: envFile.id,
                        name: envFile.name,
                        environment: envFile.environment,
                    },
                    deletedVariableCount: envFile._count.variables,
                    actor: {
                        userId: input.userId,
                        email: actorEmail,
                    },
                } as CreateWorkspaceHistoryEntryInput["data"],
            },
        });

        return {
            status: "OK" as const,
        };
    });
}

async function getEnvFileAccess(
    tx: Prisma.TransactionClient,
    input: {
        workspaceId: string;
        projectId: string;
        envFileId: string;
        userId: string;
    }
) {
    const access = await getProjectAccessContext(tx, input);

    if (!access) {
        return null;
    }

    const envFile = await tx.envFile.findFirst({
        where: {
            id: input.envFileId,
            workspaceId: input.workspaceId,
            projectId: input.projectId,
        },
        select: {
            id: true,
            name: true,
            environment: true,
        },
    });

    return envFile ? { access, envFile } : null;
}

export async function getEnvVariablesForFile(input: {
    workspaceId: string;
    projectId: string;
    envFileId: string;
    userId: string;
    via?: "cli";
}) {
    return prisma.$transaction(async (tx) => {
        const context = await getEnvFileAccess(tx, input);

        if (!context) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        const { access, envFile } = context;

        if (!hasEnvironmentAccess(access, envFile.environment)) {
            return {
                status: "FORBIDDEN" as const,
            };
        }

        const environmentKey = await getEnvironmentKeyForUser(tx, {
            projectId: input.projectId,
            environment: envFile.environment,
            userId: input.userId,
        });

        if (!environmentKey?.share) {
            return {
                status: "NO_KEY" as const,
            };
        }

        const variables = await tx.envVariable.findMany({
            where: {
                envFileId: input.envFileId,
            },
            orderBy: [{ position: "asc" }, { id: "asc" }],
            select: variableCipherSelect,
        });
        const actorEmail = await getActorEmail(tx, input.userId);

        await tx.workspaceHistory.create({
            data: {
                workspaceId: input.workspaceId,
                operation: "PROJECT_ENV_VARIABLES_ACCESSED",
                message: input.via === "cli"
                    ? `${actorEmail} pulled ${envFile.name} for project ${access.project.name} via CLI.`
                    : `${actorEmail} downloaded ${envFile.name} for project ${access.project.name}.`,
                data: {
                    project: {
                        id: input.projectId,
                        name: access.project.name,
                    },
                    envFile: {
                        id: input.envFileId,
                        name: envFile.name,
                        environment: envFile.environment,
                    },
                    variableCount: variables.length,
                    via: input.via ?? "web",
                    actor: {
                        userId: input.userId,
                        email: actorEmail,
                    },
                } as CreateWorkspaceHistoryEntryInput["data"],
            },
        });

        return {
            status: "OK" as const,
            variables: variables.map(mapEnvVariableCipherRecord),
            environmentKey,
        };
    });
}

export async function replaceEnvVariablesForFile(input: {
    workspaceId: string;
    projectId: string;
    envFileId: string;
    userId: string;
    variables: EncryptedVariable[];
    via?: "cli";
}) {
    try {
        return await prisma.$transaction(async (tx) => {
            const context = await getEnvFileAccess(tx, input);

            if (!context) {
                return {
                    status: "NOT_FOUND" as const,
                };
            }

            const { access, envFile } = context;

            if (!canEditEnvironment(access, envFile.environment)) {
                return {
                    status: "FORBIDDEN" as const,
                };
            }

            await tx.$executeRaw`SELECT id FROM "EnvFile" WHERE id = ${input.envFileId} FOR UPDATE`;

            const environmentKey = await tx.environmentKey.findUnique({
                where: {
                    projectId_environment: {
                        projectId: input.projectId,
                        environment: envFile.environment,
                    },
                },
                select: {
                    id: true,
                    version: true,
                    shares: {
                        where: { userId: input.userId },
                        select: { version: true },
                    },
                },
            });

            if (!environmentKey || !environmentKey.shares.some((share) => share.version === environmentKey.version)) {
                return {
                    status: "NO_KEY" as const,
                };
            }

            if (input.variables.some((variable) => variable.keyVersion !== environmentKey.version)) {
                return {
                    status: "STALE_KEY" as const,
                };
            }

            const existingVariables = await tx.envVariable.findMany({
                where: {
                    envFileId: input.envFileId,
                },
                select: {
                    keyDigest: true,
                    encryptedKey: true,
                    encryptedValue: true,
                    encryptedNote: true,
                    isCommented: true,
                    keyVersion: true,
                },
            });
            const existingByDigest = new Map(
                existingVariables.map((variable) => [variable.keyDigest, variable])
            );
            const nextDigests = new Set(input.variables.map((variable) => variable.keyDigest));
            const addedCount = input.variables.filter(
                (variable) => !existingByDigest.has(variable.keyDigest)
            ).length;
            const changedCount = input.variables.filter((variable) => {
                const existing = existingByDigest.get(variable.keyDigest);
                return existing ? !isSameCiphertext(existing, variable) : false;
            }).length;
            const removedCount = existingVariables.filter(
                (variable) => !nextDigests.has(variable.keyDigest)
            ).length;

            await tx.envVariable.deleteMany({
                where: {
                    envFileId: input.envFileId,
                },
            });

            if (input.variables.length > 0) {
                await tx.envVariable.createMany({
                    data: input.variables.map((variable, position) => ({
                        envFileId: input.envFileId,
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

            const variables = await tx.envVariable.findMany({
                where: {
                    envFileId: input.envFileId,
                },
                orderBy: [{ position: "asc" }, { id: "asc" }],
                select: variableCipherSelect,
            });
            const actorEmail = await getActorEmail(tx, input.userId);
            const changeSummary = `${addedCount} added, ${changedCount} changed, ${removedCount} removed`;

            await tx.workspaceHistory.create({
                data: {
                    workspaceId: input.workspaceId,
                    operation: "PROJECT_ENV_VARIABLES_SAVED",
                    message: `${actorEmail} saved ${envFile.name} in project ${access.project.name}${input.via === "cli" ? " via CLI" : ""} (${changeSummary}).`,
                    data: {
                        project: {
                            id: input.projectId,
                            name: access.project.name,
                        },
                        envFile: {
                            id: input.envFileId,
                            name: envFile.name,
                            environment: envFile.environment,
                        },
                        variableCount: variables.length,
                        addedCount,
                        changedCount,
                        removedCount,
                        keyVersion: environmentKey.version,
                        via: input.via ?? "web",
                        actor: {
                            userId: input.userId,
                            email: actorEmail,
                        },
                    } as CreateWorkspaceHistoryEntryInput["data"],
                },
            });

            return {
                status: "OK" as const,
                variables: variables.map(mapEnvVariableCipherRecord),
            };
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return {
                status: "CONFLICT" as const,
            };
        }

        throw error;
    }
}
