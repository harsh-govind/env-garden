import { prisma } from "@/lib/prisma";
import {
    defaultProjectEnvironmentTypes,
    environmentTypeLabels,
    formatEnvironmentFileName,
} from "@/lib/constants";
import {
    decryptEnvValue,
    decryptEnvValueToBuffer,
    decryptProjectKey,
    destroyBuffer,
    encryptEnvValue,
    encryptEnvValueBuffer,
    encryptProjectKey,
    generateProjectKey,
} from "@/lib/encryption";
import { Prisma } from "@/prisma/generated/client";
import type {
    ProjectAccessContext,
    ProjectDetailRecord,
    ProjectEnvFileRecord,
    ProjectEnvVariableEncryptedRecord,
    ProjectEnvVariableRecord,
} from "@/types/project";
import type {
    CreateWorkspaceHistoryEntryInput,
    EnvironmentTypeValue,
} from "@/types/workspace";

function formatUserEmail(email: string | null | undefined, userId: string) {
    return email ?? `user:${userId}`;
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

function canManageProject(context: ProjectAccessContext) {
    return (
        context.workspaceMember.role === "OWNER" ||
        context.workspaceMember.role === "ADMIN" ||
        context.projectMember?.role === "OWNER" ||
        context.projectMember?.role === "ADMIN"
    );
}

function hasEnvironmentAccess(
    context: ProjectAccessContext,
    environment: string
) {
    return (
        canManageProject(context) ||
        context.workspaceMember.projectAccessScope === "ALL_PROJECTS" ||
        context.projectMember?.envAccesses.some(
            (envAccess) => envAccess.environment === environment
        ) === true
    );
}

function canEditEnvironment(context: ProjectAccessContext, environment: string) {
    return (
        canManageProject(context) ||
        (context.projectMember?.role === "CONTRIBUTOR" &&
            hasEnvironmentAccess(context, environment))
    );
}

async function getProjectAccessContext(
    tx: Prisma.TransactionClient,
    input: {
        workspaceId: string;
        projectId: string;
        userId: string;
    }
): Promise<ProjectAccessContext | null> {
    const workspaceMember = await tx.workspaceMember.findFirst({
        where: {
            workspaceId: input.workspaceId,
            userId: input.userId,
        },
        select: {
            id: true,
            role: true,
            projectAccessScope: true,
        },
    });

    if (!workspaceMember) {
        return null;
    }

    const project = await tx.project.findFirst({
        where: {
            id: input.projectId,
            workspaceId: input.workspaceId,
        },
        select: {
            id: true,
            name: true,
        },
    });

    if (!project) {
        return null;
    }

    const projectMember = await tx.projectMember.findFirst({
        where: {
            projectId: input.projectId,
            workspaceId: input.workspaceId,
            workspaceMemberId: workspaceMember.id,
        },
        select: {
            id: true,
            role: true,
            envAccesses: {
                select: {
                    environment: true,
                },
            },
        },
    });

    if (
        workspaceMember.projectAccessScope !== "ALL_PROJECTS" &&
        !projectMember
    ) {
        return null;
    }

    return {
        project,
        projectMember: projectMember
            ? {
                id: projectMember.id,
                role: projectMember.role,
                envAccesses: projectMember.envAccesses,
            }
            : null,
        workspaceMember,
    };
}

async function getProjectKeyForProject(
    tx: Prisma.TransactionClient,
    projectId: string
) {
    const encryptionKey = await tx.projectEncryptionKey.findUnique({
        where: {
            projectId,
        },
        select: {
            encryptedKey: true,
            iv: true,
            authTag: true,
        },
    });

    if (!encryptionKey) {
        throw new Error("Project encryption key not found.");
    }

    return decryptProjectKey(encryptionKey);
}

function mapEncryptedEnvVariableRecord(
    input: ProjectEnvVariableEncryptedRecord,
    projectKey: Buffer
): ProjectEnvVariableRecord {
    return {
        id: input.id,
        key: input.key,
        value: decryptEnvValue(
            {
                encryptedValue: input.encryptedValue,
                iv: input.iv,
                authTag: input.authTag,
            },
            projectKey
        ),
        note: input.note,
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
    variables: ProjectEnvVariableEncryptedRecord[];
}, projectKey: Buffer | null): ProjectEnvFileRecord {
    if (input.variables.length > 0 && !projectKey) {
        throw new Error("Project encryption key is required to read env values.");
    }

    return {
        id: input.id,
        name: input.name,
        environment: input.environment as EnvironmentTypeValue,
        description: input.description,
        variableCount: input.variables.length,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        variables: projectKey
            ? input.variables.map((variable) =>
                mapEncryptedEnvVariableRecord(variable, projectKey)
            )
            : [],
    };
}

export async function createProjectForWorkspace(
    input: {
        workspaceId: string;
        userId: string;
        name: string;
        description?: string | null;
        environments?: EnvironmentTypeValue[] | null;
    }
) {
    const name = input.name.trim();
    const description = input.description?.trim() || null;
    const environments = Array.from(
        new Set(
            input.environments?.length
                ? input.environments
                : defaultProjectEnvironmentTypes
        )
    );

    const result = await prisma.$transaction(async (tx) => {
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
            throw new Error("Workspace not found or access denied.");
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

        const projectKey = generateProjectKey();

        try {
            await tx.projectEncryptionKey.create({
                data: {
                    projectId: createdProject.id,
                    ...encryptProjectKey(projectKey),
                },
            });
        } finally {
            destroyBuffer(projectKey);
        }

        const createdProjectMember = await tx.projectMember.create({
            data: {
                workspaceId: input.workspaceId,
                projectId: createdProject.id,
                workspaceMemberId: member.id,
                role: "OWNER",
                addedById: input.userId,
            },
        });

        await tx.envFile.createMany({
            data: environments.map((environment) => ({
                workspaceId: input.workspaceId,
                projectId: createdProject.id,
                name: formatEnvironmentFileName(environment),
                environment,
                description: `${environmentTypeLabels[environment]} environment variables for ${createdProject.name}.`,
                createdById: input.userId,
            })),
        });

        await tx.projectEnvAccess.createMany({
            data: environments.map((environment) => ({
                workspaceId: input.workspaceId,
                projectId: createdProject.id,
                projectMemberId: createdProjectMember.id,
                environment,
                grantedById: input.userId,
            })),
        });

        await tx.workspaceHistory.create({
            data: {
                workspaceId: input.workspaceId,
                operation: "PROJECT_CREATED",
                message: `Project \"${createdProject.name}\" was created by ${creatorEmail}.`,
                data: {
                    projectId: createdProject.id,
                    createdByUserId: input.userId,
                    createdByEmail: creatorEmail,
                    name: createdProject.name,
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
                    workspaceId: input.workspaceId,
                    projectId: createdProject.id,
                    createdByUserId: input.userId,
                    createdByEmail: creatorEmail,
                    environments,
                    envFileNames: environments.map(formatEnvironmentFileName),
                    projectMemberId: createdProjectMember.id,
                } as CreateWorkspaceHistoryEntryInput["data"],
            },
        });

        await tx.workspaceHistory.create({
            data: {
                workspaceId: input.workspaceId,
                operation: "PROJECT_MEMBER_ADDED",
                message: `${creatorEmail} was added by ${creatorEmail} as OWNER for project ${createdProject.name}.`,
                data: {
                    workspaceId: input.workspaceId,
                    projectId: createdProject.id,
                    targetUserId: input.userId,
                    targetEmail: creatorEmail,
                    role: "OWNER",
                    addedByUserId: input.userId,
                    addedByEmail: creatorEmail,
                } as CreateWorkspaceHistoryEntryInput["data"],
            },
        });

        return {
            envFileCount: environments.length,
            project: createdProject,
        };
    });

    return result;
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
                    select: {
                        id: true,
                        name: true,
                        environment: true,
                        description: true,
                        createdAt: true,
                        updatedAt: true,
                        variables: {
                            orderBy: {
                                key: "asc",
                            },
                            select: {
                                id: true,
                                key: true,
                                encryptedValue: true,
                                iv: true,
                                authTag: true,
                                note: true,
                                createdAt: true,
                                updatedAt: true,
                            },
                        },
                    },
                },
            },
        });

        if (!project) {
            return null;
        }

        const accessibleEnvFiles = project.envFiles.filter((envFile) =>
            hasEnvironmentAccess(access, envFile.environment)
        );
        const hasVariables = accessibleEnvFiles.some(
            (envFile) => envFile.variables.length > 0
        );
        const projectKey = hasVariables
            ? await getProjectKeyForProject(tx, input.projectId)
            : null;

        try {
            return {
                id: project.id,
                workspaceId: project.workspaceId,
                name: project.name,
                description: project.description,
                role: access.projectMember?.role ?? null,
                canManage: canManageProject(access),
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                envFiles: accessibleEnvFiles.map((envFile) =>
                    mapEnvFileRecord(envFile, projectKey)
                ),
            };
        } finally {
            destroyBuffer(projectKey);
        }
    });
}

export async function createEnvFileForProject(input: {
    workspaceId: string;
    projectId: string;
    userId: string;
    name?: string | null;
    environment: EnvironmentTypeValue;
    description?: string | null;
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
                select: {
                    id: true,
                    name: true,
                    environment: true,
                    description: true,
                    createdAt: true,
                    updatedAt: true,
                    variables: {
                        select: {
                            id: true,
                            key: true,
                            encryptedValue: true,
                            iv: true,
                            authTag: true,
                            note: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
            });

            if (access.projectMember) {
                await tx.projectEnvAccess.upsert({
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
                });
            }

            await tx.workspaceHistory.create({
                data: {
                    workspaceId: input.workspaceId,
                    operation: "PROJECT_ENV_FILE_CREATED",
                    message: `${creatorEmail} created ${envFile.name} for project ${access.project.name}.`,
                    data: {
                        workspaceId: input.workspaceId,
                        projectId: input.projectId,
                        envFileId: envFile.id,
                        envFileName: envFile.name,
                        environment: input.environment,
                        createdByUserId: input.userId,
                        createdByEmail: creatorEmail,
                    } as CreateWorkspaceHistoryEntryInput["data"],
                },
            });

            return {
                status: "OK" as const,
                envFile: mapEnvFileRecord(envFile, null),
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

export async function createEnvVariableForFile(input: {
    workspaceId: string;
    projectId: string;
    envFileId: string;
    userId: string;
    key: string;
    value: string;
    note?: string | null;
}) {
    try {
        return await prisma.$transaction(async (tx) => {
            const access = await getProjectAccessContext(tx, input);

            if (!access) {
                return {
                    status: "NOT_FOUND" as const,
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
                },
            });

            if (!envFile) {
                return {
                    status: "NOT_FOUND" as const,
                };
            }

            if (!canEditEnvironment(access, envFile.environment)) {
                return {
                    status: "FORBIDDEN" as const,
                };
            }

            const key = input.key.trim();
            const note = input.note?.trim() || null;

            const existingVariable = await tx.envVariable.findFirst({
                where: {
                    envFileId: input.envFileId,
                    key,
                },
                select: {
                    id: true,
                },
            });

            if (existingVariable) {
                return {
                    status: "CONFLICT" as const,
                };
            }

            const creator = await tx.user.findUnique({
                where: { id: input.userId },
                select: { email: true },
            });
            const creatorEmail = formatUserEmail(creator?.email, input.userId);

            const projectKey = await getProjectKeyForProject(tx, input.projectId);

            try {
                const variable = await tx.envVariable.create({
                    data: {
                        envFileId: input.envFileId,
                        key,
                        ...encryptEnvValue(input.value, projectKey),
                        note,
                    },
                    select: {
                        id: true,
                        key: true,
                        encryptedValue: true,
                        iv: true,
                        authTag: true,
                        note: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });

                await tx.workspaceHistory.create({
                    data: {
                        workspaceId: input.workspaceId,
                        operation: "PROJECT_ENV_VARIABLE_CREATED",
                        message: `${creatorEmail} added ${variable.key} to ${envFile.name} for project ${access.project.name}.`,
                        data: {
                            workspaceId: input.workspaceId,
                            projectId: input.projectId,
                            envFileId: input.envFileId,
                            envFileName: envFile.name,
                            variableId: variable.id,
                            key: variable.key,
                            createdByUserId: input.userId,
                            createdByEmail: creatorEmail,
                        } as CreateWorkspaceHistoryEntryInput["data"],
                    },
                });

                return {
                    status: "OK" as const,
                    variable: mapEncryptedEnvVariableRecord(variable, projectKey),
                };
            } finally {
                destroyBuffer(projectKey);
            }
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

export async function replaceEnvVariablesForFile(input: {
    workspaceId: string;
    projectId: string;
    envFileId: string;
    userId: string;
    variables: {
        key: string;
        value: string;
        note?: string | null;
    }[];
}) {
    try {
        return await prisma.$transaction(async (tx) => {
            const access = await getProjectAccessContext(tx, input);

            if (!access) {
                return {
                    status: "NOT_FOUND" as const,
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
                },
            });

            if (!envFile) {
                return {
                    status: "NOT_FOUND" as const,
                };
            }

            if (!canEditEnvironment(access, envFile.environment)) {
                return {
                    status: "FORBIDDEN" as const,
                };
            }

            const projectKey = input.variables.length > 0
                ? await getProjectKeyForProject(tx, input.projectId)
                : null;

            try {
                await tx.envVariable.deleteMany({
                    where: {
                        envFileId: input.envFileId,
                    },
                });

                if (input.variables.length > 0 && projectKey) {
                    await tx.envVariable.createMany({
                        data: input.variables.map((variable) => ({
                            envFileId: input.envFileId,
                            key: variable.key.trim(),
                            ...encryptEnvValue(variable.value, projectKey),
                            note: variable.note?.trim() || null,
                        })),
                    });
                }

                const variables = await tx.envVariable.findMany({
                    where: {
                        envFileId: input.envFileId,
                    },
                    orderBy: {
                        key: "asc",
                    },
                    select: {
                        id: true,
                        key: true,
                        encryptedValue: true,
                        iv: true,
                        authTag: true,
                        note: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });

                const actor = await tx.user.findUnique({
                    where: { id: input.userId },
                    select: { email: true },
                });
                const actorEmail = formatUserEmail(actor?.email, input.userId);

                await tx.workspaceHistory.create({
                    data: {
                        workspaceId: input.workspaceId,
                        operation: "PROJECT_ENV_VARIABLES_SAVED",
                        message: `${actorEmail} saved ${variables.length} variables for ${envFile.name} in project ${access.project.name}.`,
                        data: {
                            workspaceId: input.workspaceId,
                            projectId: input.projectId,
                            envFileId: input.envFileId,
                            envFileName: envFile.name,
                            variableCount: variables.length,
                            savedByUserId: input.userId,
                            savedByEmail: actorEmail,
                        } as CreateWorkspaceHistoryEntryInput["data"],
                    },
                });

                return {
                    status: "OK" as const,
                    variables: projectKey
                        ? variables.map((variable) =>
                            mapEncryptedEnvVariableRecord(variable, projectKey)
                        )
                        : [],
                };
            } finally {
                destroyBuffer(projectKey);
            }
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

export async function rotateProjectKey(projectId: string) {
    return prisma.$transaction(async (tx) => {
        const currentProjectKey = await tx.projectEncryptionKey.findUnique({
            where: {
                projectId,
            },
            select: {
                encryptedKey: true,
                iv: true,
                authTag: true,
                version: true,
            },
        });

        if (!currentProjectKey) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        const encryptedVariables = await tx.envVariable.findMany({
            where: {
                envFile: {
                    projectId,
                },
            },
            select: {
                id: true,
                encryptedValue: true,
                iv: true,
                authTag: true,
            },
        });

        let oldProjectKey: Buffer | null = null;
        let newProjectKey: Buffer | null = null;
        const decryptedValues: {
            id: string;
            value: Buffer;
        }[] = [];

        try {
            oldProjectKey = decryptProjectKey(currentProjectKey);
            newProjectKey = generateProjectKey();

            for (const variable of encryptedVariables) {
                decryptedValues.push({
                    id: variable.id,
                    value: decryptEnvValueToBuffer(
                        {
                            encryptedValue: variable.encryptedValue,
                            iv: variable.iv,
                            authTag: variable.authTag,
                        },
                        oldProjectKey
                    ),
                });
            }

            for (const variable of decryptedValues) {
                await tx.envVariable.update({
                    where: {
                        id: variable.id,
                    },
                    data: encryptEnvValueBuffer(variable.value, newProjectKey),
                });
            }

            await tx.projectEncryptionKey.update({
                where: {
                    projectId,
                },
                data: {
                    ...encryptProjectKey(newProjectKey),
                    version: {
                        increment: 1,
                    },
                },
            });

            return {
                status: "OK" as const,
                rotatedVariableCount: encryptedVariables.length,
                version: currentProjectKey.version + 1,
            };
        } finally {
            destroyBuffer(oldProjectKey);
            destroyBuffer(newProjectKey);
            for (const variable of decryptedValues) {
                destroyBuffer(variable.value);
            }
        }
    });
}
