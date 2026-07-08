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
    ProjectEnvVariableMetadataRecord,
    ProjectEnvVariableRecord,
} from "@/types/project";
import type {
    CreateWorkspaceHistoryEntryInput,
    EnvironmentTypeValue,
} from "@/types/workspace";

function formatUserEmail(email: string | null | undefined, userId: string) {
    return email ?? `user:${userId}`;
}

async function getActorEmail(tx: Prisma.TransactionClient, userId: string) {
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

function canManageProject(context: ProjectAccessContext) {
    return (
        context.workspaceMember.role === "OWNER" ||
        context.workspaceMember.role === "ADMIN" ||
        context.projectRole === "OWNER"
    );
}

function hasEnvironmentAccess(
    context: ProjectAccessContext,
    environment: string
) {
    return (
        canManageProject(context) ||
        context.workspaceMember.projectAccessScope === "ALL_PROJECTS" ||
        context.projectMember?.environmentAccessScope === "ALL_ENVIRONMENTS" ||
        context.projectMember?.envAccesses.some(
            (envAccess) => envAccess.environment === environment
        ) === true
    );
}

function canEditEnvironment(context: ProjectAccessContext, environment: string) {
    return (
        canManageProject(context) ||
        (context.projectRole === "CONTRIBUTOR" &&
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
            defaultProjectRole: true,
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
            environmentAccessScope: true,
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
                environmentAccessScope: projectMember.environmentAccessScope,
                envAccesses: projectMember.envAccesses,
            }
            : null,
        projectRole: projectMember?.role ?? workspaceMember.defaultProjectRole,
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

function mapEnvVariableMetadataRecord(
    input: ProjectEnvVariableMetadataRecord
): ProjectEnvVariableMetadataRecord {
    return {
        id: input.id,
        key: input.key,
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
    variables: ProjectEnvVariableMetadataRecord[];
}): ProjectEnvFileRecord {
    return {
        id: input.id,
        name: input.name,
        environment: input.environment as EnvironmentTypeValue,
        description: input.description,
        variableCount: input.variables.length,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        variables: input.variables.map(mapEnvVariableMetadataRecord),
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
                            project: {
                                id: input.projectId,
                                name: access.project.name,
                            },
                            envFile: {
                                id: input.envFileId,
                                name: envFile.name,
                                environment: envFile.environment,
                            },
                            variable: {
                                id: variable.id,
                                key: variable.key,
                            },
                            hasNote: Boolean(note),
                            actor: {
                                userId: input.userId,
                                email: creatorEmail,
                            },
                        } as CreateWorkspaceHistoryEntryInput["data"],
                    },
                });

                return {
                    status: "OK" as const,
                    variable: mapEnvVariableMetadataRecord(variable),
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

export async function getEnvVariablesForFile(input: {
    workspaceId: string;
    projectId: string;
    envFileId: string;
    userId: string;
}) {
    return prisma.$transaction(async (tx) => {
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

        if (!hasEnvironmentAccess(access, envFile.environment)) {
            return {
                status: "FORBIDDEN" as const,
            };
        }

        const project = access.project;
        const readableEnvFile = envFile;
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
        const actorEmail = await getActorEmail(tx, input.userId);
        const variableMetadata = variables.map((variable) => ({
            id: variable.id,
            key: variable.key,
        }));

        async function createCopyHistoryEntry() {
            await tx.workspaceHistory.create({
                data: {
                    workspaceId: input.workspaceId,
                    operation: "PROJECT_ENV_VARIABLES_COPIED",
                    message: `${actorEmail} copied all variables from ${readableEnvFile.name} for project ${project.name}.`,
                    data: {
                        project: {
                            id: input.projectId,
                            name: project.name,
                        },
                        envFile: {
                            id: input.envFileId,
                            name: readableEnvFile.name,
                            environment: readableEnvFile.environment,
                        },
                        variables: variableMetadata,
                        variableCount: variableMetadata.length,
                        actor: {
                            userId: input.userId,
                            email: actorEmail,
                        },
                    } as CreateWorkspaceHistoryEntryInput["data"],
                },
            });
        }

        if (variables.length === 0) {
            await createCopyHistoryEntry();

            return {
                status: "OK" as const,
                variables: [],
            };
        }

        const projectKey = await getProjectKeyForProject(tx, input.projectId);

        try {
            const decryptedVariables = variables.map((variable) =>
                mapEncryptedEnvVariableRecord(variable, projectKey)
            );

            await createCopyHistoryEntry();

            return {
                status: "OK" as const,
                variables: decryptedVariables,
            };
        } finally {
            destroyBuffer(projectKey);
        }
    });
}

export async function getEnvVariableForFile(input: {
    workspaceId: string;
    projectId: string;
    envFileId: string;
    variableId: string;
    userId: string;
}) {
    return prisma.$transaction(async (tx) => {
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

        if (!hasEnvironmentAccess(access, envFile.environment)) {
            return {
                status: "FORBIDDEN" as const,
            };
        }

        const variable = await tx.envVariable.findFirst({
            where: {
                id: input.variableId,
                envFileId: input.envFileId,
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

        if (!variable) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        const projectKey = await getProjectKeyForProject(tx, input.projectId);

        try {
            const decryptedVariable = mapEncryptedEnvVariableRecord(
                variable,
                projectKey
            );
            const actorEmail = await getActorEmail(tx, input.userId);

            await tx.workspaceHistory.create({
                data: {
                    workspaceId: input.workspaceId,
                    operation: "PROJECT_ENV_VARIABLE_VIEWED",
                    message: `${actorEmail} viewed ${variable.key} in ${envFile.name} for project ${access.project.name}.`,
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
                        variable: {
                            id: variable.id,
                            key: variable.key,
                        },
                        actor: {
                            userId: input.userId,
                            email: actorEmail,
                        },
                    } as CreateWorkspaceHistoryEntryInput["data"],
                },
            });

            return {
                status: "OK" as const,
                variable: decryptedVariable,
            };
        } finally {
            destroyBuffer(projectKey);
        }
    });
}

export async function replaceEnvVariablesForFile(input: {
    workspaceId: string;
    projectId: string;
    envFileId: string;
    userId: string;
    variables: {
        id?: string;
        key: string;
        value?: string;
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

            const existingVariables = await tx.envVariable.findMany({
                where: {
                    envFileId: input.envFileId,
                },
                select: {
                    id: true,
                    key: true,
                    encryptedValue: true,
                    iv: true,
                    authTag: true,
                },
            });
            const existingVariablesById = new Map(
                existingVariables.map((variable) => [variable.id, variable])
            );

            if (
                input.variables.some(
                    (variable) =>
                        variable.id && !existingVariablesById.has(variable.id)
                )
            ) {
                return {
                    status: "NOT_FOUND" as const,
                };
            }

            const needsProjectKey = input.variables.some(
                (variable) => !variable.id || typeof variable.value === "string"
            );
            const projectKey = needsProjectKey
                ? await getProjectKeyForProject(tx, input.projectId)
                : null;

            try {
                const variableData = input.variables.map((variable) => {
                    const key = variable.key.trim();
                    const note = variable.note?.trim() || null;

                    if (!variable.id) {
                        if (!projectKey || typeof variable.value !== "string") {
                            throw new Error("New variables require a value.");
                        }

                        return {
                            envFileId: input.envFileId,
                            key,
                            ...encryptEnvValue(variable.value, projectKey),
                            note,
                        };
                    }

                    const existingVariable = existingVariablesById.get(variable.id);

                    if (!existingVariable) {
                        throw new Error("Variable not found.");
                    }

                    return {
                        id: variable.id,
                        envFileId: input.envFileId,
                        key,
                        ...(typeof variable.value === "string"
                            ? encryptEnvValue(variable.value, projectKey as Buffer)
                            : {
                                encryptedValue: existingVariable.encryptedValue,
                                iv: existingVariable.iv,
                                authTag: existingVariable.authTag,
                            }),
                        note,
                    };
                });

                await tx.envVariable.deleteMany({
                    where: {
                        envFileId: input.envFileId,
                    },
                });

                if (variableData.length > 0) {
                    await tx.envVariable.createMany({
                        data: variableData,
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
                        note: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });
                const previousVariables = existingVariables.map((variable) => ({
                    id: variable.id,
                    key: variable.key,
                }));
                const savedVariables = variables.map((variable) => ({
                    id: variable.id,
                    key: variable.key,
                }));

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
                            project: {
                                id: input.projectId,
                                name: access.project.name,
                            },
                            envFile: {
                                id: input.envFileId,
                                name: envFile.name,
                                environment: envFile.environment,
                            },
                            previousVariables,
                            variables: savedVariables,
                            actor: {
                                userId: input.userId,
                                email: actorEmail,
                            },
                        } as CreateWorkspaceHistoryEntryInput["data"],
                    },
                });

                return {
                    status: "OK" as const,
                    variables: variables.map(mapEnvVariableMetadataRecord),
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
