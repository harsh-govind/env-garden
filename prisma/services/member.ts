import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
    canManageWorkspaceMembers,
    isEnvironmentTypeValue,
} from "@/lib/constants";
import { Prisma } from "@/prisma/generated/client";
import type {
    MemberAccessInput,
    MemberProjectAccessInput,
    WorkspaceInviteRecord,
    WorkspaceMemberProjectAccessRecord,
    WorkspaceMemberRecord,
    WorkspaceMembersRecord,
} from "@/types/member";
import type {
    EnvironmentAccessScopeValue,
    WorkspaceRoleValue,
} from "@/types/workspace";
import type { ProjectRoleValue } from "@/types/project";

const INVITE_EXPIRY_DAYS = 7;

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function formatUserEmail(email: string | null | undefined, userId: string) {
    return email ?? `user:${userId}`;
}

function hashInviteToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

function createInviteToken() {
    return randomBytes(32).toString("base64url");
}

function getInviteExpiryDate() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
    return expiresAt;
}

function canManageTargetRole(actorRole: WorkspaceRoleValue, targetRole: WorkspaceRoleValue) {
    return actorRole === "OWNER" || (actorRole === "ADMIN" && targetRole !== "OWNER");
}

function canEditMember(actorRole: WorkspaceRoleValue, targetRole: WorkspaceRoleValue) {
    return targetRole !== "OWNER" && canManageTargetRole(actorRole, targetRole);
}

function canAssignMemberAccess(access: MemberAccessInput) {
    return (
        access.role !== "OWNER" &&
        access.defaultProjectRole !== "OWNER" &&
        access.projects.every((project) => project.role !== "OWNER")
    );
}

function getWorkspaceRoleProjectRole(role: WorkspaceRoleValue): ProjectRoleValue {
    if (role === "OWNER") {
        return "OWNER";
    }

    if (role === "ADMIN") {
        return "CONTRIBUTOR";
    }

    return "VIEWER";
}

function getWorkspaceRoleProjectScope(role: WorkspaceRoleValue) {
    return role === "OWNER" || role === "ADMIN" ? "ALL_PROJECTS" : null;
}

function normalizeMemberAccess(input: MemberAccessInput): MemberAccessInput {
    const forcedProjectAccessScope = getWorkspaceRoleProjectScope(input.role);

    if (forcedProjectAccessScope) {
        return {
            role: input.role,
            projectAccessScope: forcedProjectAccessScope,
            defaultProjectRole: getWorkspaceRoleProjectRole(input.role),
            defaultEnvironmentAccessScope: "ALL_ENVIRONMENTS",
            projects: [],
        };
    }

    if (input.projectAccessScope === "ALL_PROJECTS") {
        return {
            ...input,
            defaultEnvironmentAccessScope: "ALL_ENVIRONMENTS",
            projects: [],
        };
    }

    return {
        ...input,
        defaultProjectRole: "VIEWER",
        defaultEnvironmentAccessScope: "ALL_ENVIRONMENTS",
    };
}

function isUniqueConstraintError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    );
}

function isMissingRelatedRecordError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
    );
}

function isForeignKeyConstraintError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
    );
}

function isPrismaValidationError(error: unknown) {
    return error instanceof Prisma.PrismaClientValidationError;
}

async function getActor(
    tx: Prisma.TransactionClient,
    input: {
        workspaceId: string;
        userId: string;
    }
) {
    return tx.workspaceMember.findFirst({
        where: {
            workspaceId: input.workspaceId,
            userId: input.userId,
        },
        select: {
            id: true,
            role: true,
            workspace: {
                select: {
                    id: true,
                    name: true,
                },
            },
            user: {
                select: {
                    email: true,
                },
            },
        },
    });
}

function mapMemberProjectAccess(input: {
    project: {
        id: string;
        name: string;
    };
    role: ProjectRoleValue;
    environmentAccessScope: EnvironmentAccessScopeValue;
    envAccesses: {
        environment: string;
    }[];
}): WorkspaceMemberProjectAccessRecord {
    return {
        projectId: input.project.id,
        projectName: input.project.name,
        role: input.role,
        environmentAccessScope: input.environmentAccessScope,
        environments:
            input.environmentAccessScope === "ALL_ENVIRONMENTS"
                ? []
                : input.envAccesses
                    .map((envAccess) => envAccess.environment)
                    .filter(isEnvironmentTypeValue),
    };
}

function mapInviteProjectAccess(input: {
    project: {
        id: string;
        name: string;
    };
    role: ProjectRoleValue;
    environmentAccessScope: EnvironmentAccessScopeValue;
    environments: {
        environment: string;
    }[];
}): WorkspaceMemberProjectAccessRecord {
    return {
        projectId: input.project.id,
        projectName: input.project.name,
        role: input.role,
        environmentAccessScope: input.environmentAccessScope,
        environments:
            input.environmentAccessScope === "ALL_ENVIRONMENTS"
                ? []
                : input.environments
                    .map((environment) => environment.environment)
                    .filter(isEnvironmentTypeValue),
    };
}

async function validateProjectAccess(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    access: MemberAccessInput
) {
    if (access.projectAccessScope === "ALL_PROJECTS") {
        return {
            status: "OK" as const,
            projects: [] satisfies MemberProjectAccessInput[],
        };
    }

    if (access.projects.length === 0) {
        return {
            status: "INVALID_ACCESS" as const,
        };
    }

    const projectIds = [...new Set(access.projects.map((project) => project.projectId))];

    if (projectIds.length !== access.projects.length) {
        return {
            status: "INVALID_ACCESS" as const,
        };
    }

    const projects = await tx.project.findMany({
        where: {
            workspaceId,
            id: {
                in: projectIds,
            },
        },
        select: {
            id: true,
            envFiles: {
                select: {
                    environment: true,
                },
            },
        },
    });

    if (projects.length !== projectIds.length) {
        return {
            status: "INVALID_ACCESS" as const,
        };
    }

    const projectEnvironmentMap = new Map(
        projects.map((project) => [
            project.id,
            new Set(
                project.envFiles
                    .map((envFile) => envFile.environment)
                    .filter(isEnvironmentTypeValue)
            ),
        ])
    );

    const normalizedProjects = access.projects.map((project) => {
        const environments = [...new Set(project.environments)];
        const projectEnvironments = projectEnvironmentMap.get(project.projectId);

        if (
            project.environmentAccessScope === "SELECTED_ENVIRONMENTS" &&
            environments.length === 0
        ) {
            return null;
        }

        if (
            project.environmentAccessScope === "SELECTED_ENVIRONMENTS" &&
            (
                !projectEnvironments ||
                environments.some(
                    (environment) =>
                        !isEnvironmentTypeValue(environment) ||
                        !projectEnvironments.has(environment)
                )
            )
        ) {
            return null;
        }

        return {
            ...project,
            environments:
                project.environmentAccessScope === "ALL_ENVIRONMENTS"
                    ? []
                    : environments,
        };
    });

    if (normalizedProjects.some((project) => project === null)) {
        return {
            status: "INVALID_ACCESS" as const,
        };
    }

    return {
        status: "OK" as const,
        projects: normalizedProjects as MemberProjectAccessInput[],
    };
}

async function createProjectMembers(
    tx: Prisma.TransactionClient,
    input: {
        workspaceId: string;
        workspaceMemberId: string;
        addedById: string | null;
        projects: MemberProjectAccessInput[];
    }
) {
    for (const project of input.projects) {
        const projectWhere = {
            id_workspaceId: {
                id: project.projectId,
                workspaceId: input.workspaceId,
            },
        };
        const addedBy = input.addedById
            ? {
                connect: {
                    id: input.addedById,
                },
            }
            : undefined;

        await tx.projectMember.create({
            data: {
                role: project.role,
                environmentAccessScope: project.environmentAccessScope,
                project: {
                    connect: projectWhere,
                },
                workspaceMember: {
                    connect: {
                        id_workspaceId: {
                            id: input.workspaceMemberId,
                            workspaceId: input.workspaceId,
                        },
                    },
                },
                addedBy,
                envAccesses: {
                    create:
                        project.environmentAccessScope === "SELECTED_ENVIRONMENTS"
                            ? project.environments.map((environment) => ({
                                environment,
                                project: {
                                    connect: projectWhere,
                                },
                                grantedBy: addedBy,
                            }))
                            : [],
                },
            },
        });
    }
}

function canRemoveMember(input: {
    actorId: string;
    actorRole: WorkspaceRoleValue;
    targetId: string;
    targetRole: WorkspaceRoleValue;
}) {
    return (
        input.actorId !== input.targetId &&
        input.targetRole !== "OWNER" &&
        canManageTargetRole(input.actorRole, input.targetRole)
    );
}

export async function listWorkspaceMembersForUser(input: {
    workspaceId: string;
    userId: string;
}): Promise<
    | { status: "NOT_FOUND" }
    | { status: "OK"; record: WorkspaceMembersRecord }
> {
    const actor = await getActor(prisma, input);

    if (!actor) {
        return {
            status: "NOT_FOUND",
        };
    }

    const [members, invites, projects] = await Promise.all([
        prisma.workspaceMember.findMany({
            where: {
                workspaceId: input.workspaceId,
            },
            select: {
                id: true,
                userId: true,
                role: true,
                projectAccessScope: true,
                defaultProjectRole: true,
                defaultEnvironmentAccessScope: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
                addedBy: {
                    select: {
                        email: true,
                    },
                },
                projectMembers: {
                    select: {
                        role: true,
                        environmentAccessScope: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        envAccesses: {
                            select: {
                                environment: true,
                            },
                            orderBy: {
                                environment: "asc",
                            },
                        },
                    },
                    orderBy: {
                        project: {
                            name: "asc",
                        },
                    },
                },
            },
            orderBy: [
                {
                    createdAt: "asc",
                },
                {
                    id: "asc",
                },
            ],
        }),
        prisma.workspaceInvite.findMany({
            where: {
                workspaceId: input.workspaceId,
            },
            select: {
                id: true,
                email: true,
                role: true,
                projectAccessScope: true,
                defaultProjectRole: true,
                defaultEnvironmentAccessScope: true,
                status: true,
                emailSentAt: true,
                expiresAt: true,
                acceptedAt: true,
                revokedAt: true,
                createdAt: true,
                updatedAt: true,
                invitedBy: {
                    select: {
                        email: true,
                    },
                },
                acceptedBy: {
                    select: {
                        email: true,
                    },
                },
                revokedBy: {
                    select: {
                        email: true,
                    },
                },
                projectAccesses: {
                    select: {
                        role: true,
                        environmentAccessScope: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        environments: {
                            select: {
                                environment: true,
                            },
                            orderBy: {
                                environment: "asc",
                            },
                        },
                    },
                    orderBy: {
                        project: {
                            name: "asc",
                        },
                    },
                },
            },
            orderBy: [
                {
                    updatedAt: "desc",
                },
                {
                    createdAt: "desc",
                },
            ],
        }),
        prisma.project.findMany({
            where: {
                workspaceId: input.workspaceId,
            },
            select: {
                id: true,
                name: true,
                envFiles: {
                    select: {
                        environment: true,
                    },
                    orderBy: {
                        environment: "asc",
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        }),
    ]);

    const canManage = canManageWorkspaceMembers(actor.role);

    return {
        status: "OK",
        record: {
            workspaceId: actor.workspace.id,
            workspaceName: actor.workspace.name,
            actorMemberId: actor.id,
            actorRole: actor.role,
            canManage,
            members: members.map<WorkspaceMemberRecord>((member) => ({
                id: member.id,
                userId: member.userId,
                email: member.user.email,
                name: member.user.name,
                role: member.role,
                projectAccessScope: member.projectAccessScope,
                defaultProjectRole: member.defaultProjectRole,
                defaultEnvironmentAccessScope: member.defaultEnvironmentAccessScope,
                addedByEmail: member.addedBy?.email ?? null,
                createdAt: member.createdAt,
                updatedAt: member.updatedAt,
                projects: member.projectMembers.map(mapMemberProjectAccess),
                canEdit: canManage && canEditMember(actor.role, member.role),
                canRemove: canRemoveMember({
                    actorId: actor.id,
                    actorRole: actor.role,
                    targetId: member.id,
                    targetRole: member.role,
                }),
            })),
            invites: invites.map<WorkspaceInviteRecord>((invite) => ({
                id: invite.id,
                email: invite.email,
                role: invite.role,
                projectAccessScope: invite.projectAccessScope,
                defaultProjectRole: invite.defaultProjectRole,
                defaultEnvironmentAccessScope: invite.defaultEnvironmentAccessScope,
                status: invite.status,
                invitedByEmail: invite.invitedBy?.email ?? null,
                acceptedByEmail: invite.acceptedBy?.email ?? null,
                revokedByEmail: invite.revokedBy?.email ?? null,
                emailSentAt: invite.emailSentAt,
                expiresAt: invite.expiresAt,
                acceptedAt: invite.acceptedAt,
                revokedAt: invite.revokedAt,
                createdAt: invite.createdAt,
                updatedAt: invite.updatedAt,
                projects: invite.projectAccesses.map(mapInviteProjectAccess),
                canRevoke:
                    invite.status === "PENDING" &&
                    canManage &&
                    canManageTargetRole(actor.role, invite.role),
            })),
            projects: projects.map((project) => ({
                id: project.id,
                name: project.name,
                environments: [
                    ...new Set(
                        project.envFiles
                            .map((envFile) => envFile.environment)
                            .filter(isEnvironmentTypeValue)
                    ),
                ],
            })),
        },
    };
}

export async function inviteWorkspaceMember(input: {
    workspaceId: string;
    actorUserId: string;
    email: string;
    access: MemberAccessInput;
}): Promise<
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
    | { status: "INVALID_ACCESS" }
    | { status: "MEMBER_EXISTS" }
    | { status: "INVITE_EXISTS" }
    | {
        status: "OK";
        invite: WorkspaceInviteRecord;
        token: string;
        workspaceName: string;
        actorEmail: string;
    }
> {
    const email = normalizeEmail(input.email);
    const access = normalizeMemberAccess(input.access);
    const token = createInviteToken();
    const tokenHash = hashInviteToken(token);

    try {
        return await prisma.$transaction(async (tx) => {
            const actor = await getActor(tx, {
                workspaceId: input.workspaceId,
                userId: input.actorUserId,
            });

            if (!actor) {
                return {
                    status: "NOT_FOUND" as const,
                };
            }

            if (
                !canManageWorkspaceMembers(actor.role) ||
                !canAssignMemberAccess(access) ||
                !canManageTargetRole(actor.role, access.role)
            ) {
                return {
                    status: "FORBIDDEN" as const,
                };
            }

            const projectAccess = await validateProjectAccess(
                tx,
                input.workspaceId,
                access
            );

            if (projectAccess.status !== "OK") {
                return {
                    status: "INVALID_ACCESS" as const,
                };
            }

            const existingUser = await tx.user.findUnique({
                where: {
                    email,
                },
                select: {
                    id: true,
                },
            });

            if (existingUser) {
                const existingMember = await tx.workspaceMember.findUnique({
                    where: {
                        workspaceId_userId: {
                            workspaceId: input.workspaceId,
                            userId: existingUser.id,
                        },
                    },
                    select: {
                        id: true,
                    },
                });

                if (existingMember) {
                    return {
                        status: "MEMBER_EXISTS" as const,
                    };
                }
            }

            const pendingInvite = await tx.workspaceInvite.findFirst({
                where: {
                    workspaceId: input.workspaceId,
                    email,
                    status: "PENDING",
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                select: {
                    id: true,
                },
            });

            if (pendingInvite) {
                return {
                    status: "INVITE_EXISTS" as const,
                };
            }

            const invite = await tx.workspaceInvite.create({
                data: {
                    email,
                    role: access.role,
                    projectAccessScope: access.projectAccessScope,
                    defaultProjectRole: access.defaultProjectRole,
                    defaultEnvironmentAccessScope: access.defaultEnvironmentAccessScope,
                    tokenHash,
                    workspace: {
                        connect: {
                            id: input.workspaceId,
                        },
                    },
                    invitedBy: {
                        connect: {
                            id: input.actorUserId,
                        },
                    },
                    expiresAt: getInviteExpiryDate(),
                    projectAccesses: {
                        create: projectAccess.projects.map((project) => ({
                            role: project.role,
                            environmentAccessScope: project.environmentAccessScope,
                            project: {
                                connect: {
                                    id_workspaceId: {
                                        id: project.projectId,
                                        workspaceId: input.workspaceId,
                                    },
                                },
                            },
                            environments: {
                                create:
                                    project.environmentAccessScope === "SELECTED_ENVIRONMENTS"
                                        ? project.environments.map((environment) => ({
                                            environment,
                                        }))
                                        : [],
                            },
                        })),
                    },
                },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    projectAccessScope: true,
                    defaultProjectRole: true,
                    defaultEnvironmentAccessScope: true,
                    status: true,
                    emailSentAt: true,
                    expiresAt: true,
                    acceptedAt: true,
                    revokedAt: true,
                    createdAt: true,
                    updatedAt: true,
                    invitedBy: {
                        select: {
                            email: true,
                        },
                    },
                    projectAccesses: {
                        select: {
                            role: true,
                            environmentAccessScope: true,
                            project: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                            environments: {
                                select: {
                                    environment: true,
                                },
                                orderBy: {
                                    environment: "asc",
                                },
                            },
                        },
                        orderBy: {
                            project: {
                                name: "asc",
                            },
                        },
                    },
                },
            });

            const actorEmail = formatUserEmail(actor.user.email, input.actorUserId);

            await tx.workspaceHistory.create({
                data: {
                    workspaceId: input.workspaceId,
                    operation: "WORKSPACE_INVITE_CREATED",
                    message: `${actorEmail} invited ${email} to ${actor.workspace.name} as ${access.role}.`,
                    data: {
                        invite: {
                            id: invite.id,
                            email,
                            role: access.role,
                            projectAccessScope: access.projectAccessScope,
                        },
                        projects: projectAccess.projects,
                        actor: {
                            userId: input.actorUserId,
                            email: actorEmail,
                        },
                    },
                },
            });

            return {
                status: "OK" as const,
                invite: {
                    id: invite.id,
                    email: invite.email,
                    role: invite.role,
                    projectAccessScope: invite.projectAccessScope,
                    defaultProjectRole: invite.defaultProjectRole,
                    defaultEnvironmentAccessScope: invite.defaultEnvironmentAccessScope,
                    status: invite.status,
                    invitedByEmail: invite.invitedBy?.email ?? null,
                    acceptedByEmail: null,
                    revokedByEmail: null,
                    emailSentAt: invite.emailSentAt,
                    expiresAt: invite.expiresAt,
                    acceptedAt: invite.acceptedAt,
                    revokedAt: invite.revokedAt,
                    createdAt: invite.createdAt,
                    updatedAt: invite.updatedAt,
                    projects: invite.projectAccesses.map(mapInviteProjectAccess),
                    canRevoke: true,
                },
                token,
                workspaceName: actor.workspace.name,
                actorEmail,
            };
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return {
                status: "INVITE_EXISTS",
            };
        }

        if (
            isMissingRelatedRecordError(error) ||
            isForeignKeyConstraintError(error) ||
            isPrismaValidationError(error)
        ) {
            return {
                status: "INVALID_ACCESS",
            };
        }

        throw error;
    }
}

export async function markWorkspaceInviteEmailSent(inviteId: string) {
    await prisma.workspaceInvite.update({
        where: {
            id: inviteId,
        },
        data: {
            emailSentAt: new Date(),
        },
    });
}

export async function updateWorkspaceMember(input: {
    workspaceId: string;
    actorUserId: string;
    memberId: string;
    access: MemberAccessInput;
}): Promise<
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
    | { status: "INVALID_ACCESS" }
    | { status: "OK"; member: WorkspaceMemberRecord }
> {
    const access = normalizeMemberAccess(input.access);

    return prisma.$transaction(async (tx) => {
        const actor = await getActor(tx, {
            workspaceId: input.workspaceId,
            userId: input.actorUserId,
        });

        if (!actor) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        const target = await tx.workspaceMember.findFirst({
            where: {
                id: input.memberId,
                workspaceId: input.workspaceId,
            },
            select: {
                id: true,
                userId: true,
                role: true,
                user: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        });

        if (!target) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        if (
            !canManageWorkspaceMembers(actor.role) ||
            !canEditMember(actor.role, target.role) ||
            !canAssignMemberAccess(access) ||
            !canManageTargetRole(actor.role, access.role)
        ) {
            return {
                status: "FORBIDDEN" as const,
            };
        }

        const projectAccess = await validateProjectAccess(
            tx,
            input.workspaceId,
            access
        );

        if (projectAccess.status !== "OK") {
            return {
                status: "INVALID_ACCESS" as const,
            };
        }

        await tx.projectMember.deleteMany({
            where: {
                workspaceId: input.workspaceId,
                workspaceMemberId: input.memberId,
            },
        });

        await tx.workspaceMember.update({
            where: {
                id: input.memberId,
            },
            data: {
                role: access.role,
                projectAccessScope: access.projectAccessScope,
                defaultProjectRole: access.defaultProjectRole,
                defaultEnvironmentAccessScope: access.defaultEnvironmentAccessScope,
                addedById: input.actorUserId,
            },
        });

        await createProjectMembers(tx, {
            workspaceId: input.workspaceId,
            workspaceMemberId: input.memberId,
            addedById: input.actorUserId,
            projects: projectAccess.projects,
        });

        const member = await tx.workspaceMember.findUniqueOrThrow({
            where: {
                id: input.memberId,
            },
            select: {
                id: true,
                userId: true,
                role: true,
                projectAccessScope: true,
                defaultProjectRole: true,
                defaultEnvironmentAccessScope: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
                addedBy: {
                    select: {
                        email: true,
                    },
                },
                projectMembers: {
                    select: {
                        role: true,
                        environmentAccessScope: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        envAccesses: {
                            select: {
                                environment: true,
                            },
                            orderBy: {
                                environment: "asc",
                            },
                        },
                    },
                    orderBy: {
                        project: {
                            name: "asc",
                        },
                    },
                },
            },
        });

        const actorEmail = formatUserEmail(actor.user.email, input.actorUserId);

        await tx.workspaceHistory.create({
            data: {
                workspaceId: input.workspaceId,
                operation: "WORKSPACE_MEMBER_UPDATED",
                message: `${actorEmail} updated ${member.user.email}'s workspace access.`,
                data: {
                    target: {
                        userId: member.userId,
                        email: member.user.email,
                        workspaceMemberId: member.id,
                    },
                    role: access.role,
                    projectAccessScope: access.projectAccessScope,
                    projects: projectAccess.projects,
                    actor: {
                        userId: input.actorUserId,
                        email: actorEmail,
                    },
                },
            },
        });

        return {
            status: "OK" as const,
            member: {
                id: member.id,
                userId: member.userId,
                email: member.user.email,
                name: member.user.name,
                role: member.role,
                projectAccessScope: member.projectAccessScope,
                defaultProjectRole: member.defaultProjectRole,
                defaultEnvironmentAccessScope: member.defaultEnvironmentAccessScope,
                addedByEmail: member.addedBy?.email ?? null,
                createdAt: member.createdAt,
                updatedAt: member.updatedAt,
                projects: member.projectMembers.map(mapMemberProjectAccess),
                canEdit: canEditMember(actor.role, member.role),
                canRemove: canRemoveMember({
                    actorId: actor.id,
                    actorRole: actor.role,
                    targetId: member.id,
                    targetRole: member.role,
                }),
            },
        };
    });
}

export async function removeWorkspaceMember(input: {
    workspaceId: string;
    actorUserId: string;
    memberId: string;
}): Promise<
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
    | { status: "OK" }
> {
    return prisma.$transaction(async (tx) => {
        const actor = await getActor(tx, {
            workspaceId: input.workspaceId,
            userId: input.actorUserId,
        });

        if (!actor) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        const target = await tx.workspaceMember.findFirst({
            where: {
                id: input.memberId,
                workspaceId: input.workspaceId,
            },
            select: {
                id: true,
                userId: true,
                role: true,
                user: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        if (!target) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        if (target.role === "OWNER") {
            return {
                status: "FORBIDDEN" as const,
            };
        }

        if (
            !canManageWorkspaceMembers(actor.role) ||
            !canRemoveMember({
                actorId: actor.id,
                actorRole: actor.role,
                targetId: target.id,
                targetRole: target.role,
            })
        ) {
            return { status: "FORBIDDEN" as const };
        }

        await tx.workspaceMember.delete({
            where: {
                id: input.memberId,
            },
        });

        const actorEmail = formatUserEmail(actor.user.email, input.actorUserId);

        await tx.workspaceHistory.create({
            data: {
                workspaceId: input.workspaceId,
                operation: "WORKSPACE_MEMBER_REMOVED",
                message: `${actorEmail} removed ${target.user.email} from ${actor.workspace.name}.`,
                data: {
                    target: {
                        userId: target.userId,
                        email: target.user.email,
                        workspaceMemberId: target.id,
                        role: target.role,
                    },
                    actor: {
                        userId: input.actorUserId,
                        email: actorEmail,
                    },
                },
            },
        });

        return {
            status: "OK" as const,
        };
    });
}

export async function revokeWorkspaceInvite(input: {
    workspaceId: string;
    actorUserId: string;
    inviteId: string;
}): Promise<
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
    | { status: "OK" }
> {
    return prisma.$transaction(async (tx) => {
        const actor = await getActor(tx, {
            workspaceId: input.workspaceId,
            userId: input.actorUserId,
        });

        if (!actor) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        const invite = await tx.workspaceInvite.findFirst({
            where: {
                id: input.inviteId,
                workspaceId: input.workspaceId,
                status: "PENDING",
            },
            select: {
                id: true,
                email: true,
                role: true,
            },
        });

        if (!invite) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        if (
            !canManageWorkspaceMembers(actor.role) ||
            !canManageTargetRole(actor.role, invite.role)
        ) {
            return {
                status: "FORBIDDEN" as const,
            };
        }

        await tx.workspaceInvite.update({
            where: {
                id: invite.id,
            },
            data: {
                status: "REVOKED",
                revokedAt: new Date(),
                revokedById: input.actorUserId,
            },
        });

        const actorEmail = formatUserEmail(actor.user.email, input.actorUserId);

        await tx.workspaceHistory.create({
            data: {
                workspaceId: input.workspaceId,
                operation: "WORKSPACE_INVITE_REVOKED",
                message: `${actorEmail} revoked ${invite.email}'s invite to ${actor.workspace.name}.`,
                data: {
                    invite: {
                        id: invite.id,
                        email: invite.email,
                        role: invite.role,
                    },
                    actor: {
                        userId: input.actorUserId,
                        email: actorEmail,
                    },
                },
            },
        });

        return {
            status: "OK" as const,
        };
    });
}

export async function acceptWorkspaceInvite(input: {
    token: string;
    userId: string;
}): Promise<
    | { status: "NOT_FOUND" }
    | { status: "UNAVAILABLE" }
    | { status: "EXPIRED" }
    | { status: "EMAIL_MISMATCH" }
    | { status: "MEMBER_EXISTS" }
    | { status: "OK"; workspaceId: string; workspaceName: string }
> {
    const tokenHash = hashInviteToken(input.token);

    return prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: {
                id: input.userId,
            },
            select: {
                email: true,
            },
        });

        if (!user) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        const invite = await tx.workspaceInvite.findUnique({
            where: {
                tokenHash,
            },
            select: {
                id: true,
                workspaceId: true,
                email: true,
                role: true,
                projectAccessScope: true,
                defaultProjectRole: true,
                defaultEnvironmentAccessScope: true,
                status: true,
                invitedById: true,
                expiresAt: true,
                workspace: {
                    select: {
                        name: true,
                    },
                },
                projectAccesses: {
                    select: {
                        projectId: true,
                        role: true,
                        environmentAccessScope: true,
                        environments: {
                            select: {
                                environment: true,
                            },
                        },
                    },
                },
            },
        });

        if (!invite) {
            return {
                status: "NOT_FOUND" as const,
            };
        }

        if (invite.status !== "PENDING") {
            return {
                status: "UNAVAILABLE" as const,
            };
        }

        if (invite.expiresAt.getTime() <= Date.now()) {
            return {
                status: "EXPIRED" as const,
            };
        }

        if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
            return {
                status: "EMAIL_MISMATCH" as const,
            };
        }

        const existingMember = await tx.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: invite.workspaceId,
                    userId: input.userId,
                },
            },
            select: {
                id: true,
            },
        });

        if (existingMember) {
            return {
                status: "MEMBER_EXISTS" as const,
            };
        }

        const member = await tx.workspaceMember.create({
            data: {
                workspaceId: invite.workspaceId,
                userId: input.userId,
                role: invite.role,
                projectAccessScope: invite.projectAccessScope,
                defaultProjectRole: invite.defaultProjectRole,
                defaultEnvironmentAccessScope: invite.defaultEnvironmentAccessScope,
                addedById: invite.invitedById,
            },
            select: {
                id: true,
            },
        });

        await createProjectMembers(tx, {
            workspaceId: invite.workspaceId,
            workspaceMemberId: member.id,
            addedById: invite.invitedById,
            projects:
                invite.projectAccessScope === "SELECTED_PROJECTS"
                    ? invite.projectAccesses.map((project) => ({
                        projectId: project.projectId,
                        role: project.role,
                        environmentAccessScope: project.environmentAccessScope,
                        environments: project.environments
                            .map((environment) => environment.environment)
                            .filter(isEnvironmentTypeValue),
                    }))
                    : [],
        });

        await tx.workspaceInvite.update({
            where: {
                id: invite.id,
            },
            data: {
                status: "ACCEPTED",
                acceptedAt: new Date(),
                acceptedById: input.userId,
            },
        });

        await tx.workspaceHistory.create({
            data: {
                workspaceId: invite.workspaceId,
                operation: "WORKSPACE_INVITE_ACCEPTED",
                message: `${user.email} accepted an invite to ${invite.workspace.name}.`,
                data: {
                    invite: {
                        id: invite.id,
                        email: invite.email,
                        role: invite.role,
                    },
                    target: {
                        userId: input.userId,
                        email: user.email,
                        workspaceMemberId: member.id,
                    },
                },
            },
        });

        return {
            status: "OK" as const,
            workspaceId: invite.workspaceId,
            workspaceName: invite.workspace.name,
        };
    });
}
