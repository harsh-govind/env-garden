import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type {
    EnvironmentTypeValue,
    InviteEnvironmentScopeValue,
    ProjectAccessScopeValue,
    WorkspaceInviteProjectAccessInput,
    WorkspaceInviteProjectOption,
    WorkspaceInviteRecord,
    WorkspaceInviteSummary,
    WorkspaceMemberRecord,
    WorkspaceMemberSummary,
    WorkspaceRoleValue,
} from "@/types/workspace";

const INVITE_EXPIRES_IN_DAYS = 7;

type NormalizedInviteProjectAccess = {
    projectId: string;
    environmentScope: InviteEnvironmentScopeValue;
    environments: EnvironmentTypeValue[];
};

function formatUserEmail(email: string | null | undefined, userId: string) {
    return email ?? `user:${userId}`;
}

function getEffectiveProjectAccessScope(
    role: WorkspaceRoleValue,
    scope: ProjectAccessScopeValue
): ProjectAccessScopeValue {
    return role === "OWNER" || role === "ADMIN" ? "ALL_PROJECTS" : scope;
}

function createInviteToken() {
    return crypto.randomBytes(32).toString("base64url");
}

function hashInviteToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function getInviteAcceptUrl(token: string) {
    const baseUrl =
        process.env.NEXTAUTH_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";

    return `${baseUrl.replace(/\/$/, "")}/api/workspace-invites/${token}/accept`;
}

function logWorkspaceInviteEmail(input: {
    email: string;
    workspaceName: string;
    inviterEmail: string;
    role: WorkspaceRoleValue;
    token: string;
}) {
    console.log("[workspace invite email]", {
        to: input.email,
        subject: `Invitation to ${input.workspaceName}`,
        role: input.role,
        acceptUrl: getInviteAcceptUrl(input.token),
        method: "POST",
        invitedBy: input.inviterEmail,
    });
}

function serializeMemberRecord(
    member: WorkspaceMemberRecord
): WorkspaceMemberSummary {
    return {
        id: member.id,
        userId: member.userId,
        email: member.user.email,
        name: member.user.name,
        avatar: member.user.avatar,
        role: member.role,
        projectAccessScope: getEffectiveProjectAccessScope(
            member.role,
            member.projectAccessScope
        ),
        addedBy: member.addedBy
            ? {
                id: member.addedBy.id,
                name: member.addedBy.name,
                email: member.addedBy.email,
            }
            : null,
        createdAt: member.createdAt.toISOString(),
    };
}

function serializeInviteRecord(
    invite: WorkspaceInviteRecord
): WorkspaceInviteSummary {
    return {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        invitedBy: {
            id: invite.invitedBy.id,
            name: invite.invitedBy.name,
            email: invite.invitedBy.email,
        },
        projectAccesses: invite.projectAccesses.map((projectAccess) => ({
            projectId: projectAccess.projectId,
            projectName: projectAccess.project.name,
            environmentScope: projectAccess.environmentScope,
            environments: projectAccess.environments.map(
                (envAccess) => envAccess.environment as EnvironmentTypeValue
            ),
        })),
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
    };
}

function serializeProjectOption(project: {
    id: string;
    name: string;
    envFiles: {
        environment: string;
    }[];
}): WorkspaceInviteProjectOption {
    return {
        id: project.id,
        name: project.name,
        environments: Array.from(
            new Set(
                project.envFiles.map(
                    (envFile) => envFile.environment as EnvironmentTypeValue
                )
            )
        ),
    };
}

async function getWorkspaceInviteProjectOptions(workspaceId: string) {
    const projects = await prisma.project.findMany({
        where: {
            workspaceId,
        },
        orderBy: {
            name: "asc",
        },
        select: {
            id: true,
            name: true,
            envFiles: {
                orderBy: {
                    environment: "asc",
                },
                select: {
                    environment: true,
                },
            },
        },
    });

    return projects.map(serializeProjectOption);
}

async function normalizeInviteProjectAccesses(input: {
    workspaceId: string;
    role: WorkspaceRoleValue;
    projectAccesses: WorkspaceInviteProjectAccessInput[];
}): Promise<
    | { status: "OK"; projectAccesses: NormalizedInviteProjectAccess[] }
    | { status: "INVALID_ACCESS"; message: string }
> {
    if (input.role === "ADMIN") {
        return {
            status: "OK",
            projectAccesses: [],
        };
    }

    const uniqueProjectAccesses = Array.from(
        new Map(
            input.projectAccesses.map((projectAccess) => [
                projectAccess.projectId,
                projectAccess,
            ])
        ).values()
    );

    if (uniqueProjectAccesses.length === 0) {
        return {
            status: "INVALID_ACCESS",
            message: "Select at least one project for member access.",
        };
    }

    const projects = await prisma.project.findMany({
        where: {
            workspaceId: input.workspaceId,
            id: {
                in: uniqueProjectAccesses.map(
                    (projectAccess) => projectAccess.projectId
                ),
            },
        },
        select: {
            id: true,
            name: true,
            envFiles: {
                select: {
                    environment: true,
                },
            },
        },
    });

    const projectsById = new Map(projects.map((project) => [project.id, project]));

    if (projectsById.size !== uniqueProjectAccesses.length) {
        return {
            status: "INVALID_ACCESS",
            message: "One or more selected projects were not found.",
        };
    }

    const normalized = uniqueProjectAccesses.map((projectAccess) => {
        const project = projectsById.get(projectAccess.projectId);
        const availableEnvironments = new Set(
            project?.envFiles.map(
                (envFile) => envFile.environment as EnvironmentTypeValue
            ) ?? []
        );

        if (projectAccess.environmentScope === "ALL_ENVIRONMENTS") {
            return {
                projectId: projectAccess.projectId,
                environmentScope: projectAccess.environmentScope,
                environments: Array.from(availableEnvironments),
            };
        }

        const requestedEnvironments = Array.from(
            new Set(projectAccess.environments ?? [])
        );

        if (
            availableEnvironments.size > 0 &&
            requestedEnvironments.length === 0
        ) {
            throw new Error(
                `Select at least one environment for ${project?.name ?? "the project"}.`
            );
        }

        const hasInvalidEnvironment = requestedEnvironments.some(
            (environment) => !availableEnvironments.has(environment)
        );

        if (hasInvalidEnvironment) {
            throw new Error(
                `One or more environments for ${project?.name ?? "a project"} are invalid.`
            );
        }

        return {
            projectId: projectAccess.projectId,
            environmentScope: projectAccess.environmentScope,
            environments: requestedEnvironments,
        };
    });

    return {
        status: "OK",
        projectAccesses: normalized,
    };
}

export async function listWorkspaceMembersForUser(
    workspaceId: string,
    userId: string
): Promise<
    | {
        status: "OK";
        members: WorkspaceMemberSummary[];
        invites: WorkspaceInviteSummary[];
        projects: WorkspaceInviteProjectOption[];
    }
    | { status: "NOT_FOUND" }
> {
    const membership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            userId,
        },
        select: { id: true, role: true },
    });

    if (!membership) {
        return { status: "NOT_FOUND" };
    }

    const canManageMembers =
        membership.role === "OWNER" || membership.role === "ADMIN";

    const [members, invites, projects] = await Promise.all([
        prisma.workspaceMember.findMany({
            where: { workspaceId },
            select: {
                id: true,
                workspaceId: true,
                userId: true,
                role: true,
                projectAccessScope: true,
                addedById: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatar: true,
                    },
                },
                addedBy: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        }),
        canManageMembers
            ? prisma.workspaceInvite.findMany({
                where: {
                    workspaceId,
                    acceptedAt: null,
                    revokedAt: null,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                select: {
                    id: true,
                    workspaceId: true,
                    email: true,
                    role: true,
                    expiresAt: true,
                    createdAt: true,
                    invitedBy: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                    projectAccesses: {
                        orderBy: {
                            createdAt: "asc",
                        },
                        select: {
                            projectId: true,
                            environmentScope: true,
                            project: {
                                select: {
                                    name: true,
                                },
                            },
                            environments: {
                                orderBy: {
                                    environment: "asc",
                                },
                                select: {
                                    environment: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            })
            : Promise.resolve([]),
        canManageMembers
            ? getWorkspaceInviteProjectOptions(workspaceId)
            : Promise.resolve([]),
    ]);

    return {
        status: "OK",
        members: members.map(serializeMemberRecord),
        invites: invites.map(serializeInviteRecord),
        projects,
    };
}

export async function inviteWorkspaceMember({
    workspaceId,
    email,
    role,
    invitedById,
    projectAccesses,
}: {
    workspaceId: string;
    email: string;
    role: WorkspaceRoleValue;
    invitedById: string;
    projectAccesses: WorkspaceInviteProjectAccessInput[];
}): Promise<
    | { status: "OK"; invite: WorkspaceInviteSummary }
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
    | { status: "ALREADY_MEMBER" }
    | { status: "INVALID_ACCESS"; message: string }
> {
    const inviterMembership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            userId: invitedById,
        },
        select: { role: true },
    });

    if (!inviterMembership) {
        return { status: "NOT_FOUND" };
    }

    if (
        inviterMembership.role !== "OWNER" &&
        inviterMembership.role !== "ADMIN"
    ) {
        return { status: "FORBIDDEN" };
    }

    const normalizedProjectAccesses = await normalizeInviteProjectAccesses({
        workspaceId,
        role,
        projectAccesses,
    }).catch((error) => ({
        status: "INVALID_ACCESS" as const,
        message:
            error instanceof Error
                ? error.message
                : "Invalid project access selection.",
    }));

    if (normalizedProjectAccesses.status === "INVALID_ACCESS") {
        return normalizedProjectAccesses;
    }

    const token = createInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRES_IN_DAYS);

    const result = await prisma.$transaction(async (tx) => {
        const [workspace, inviter, targetUser] = await Promise.all([
            tx.workspace.findUnique({
                where: { id: workspaceId },
                select: { id: true, name: true },
            }),
            tx.user.findUnique({
                where: { id: invitedById },
                select: { email: true },
            }),
            tx.user.findUnique({
                where: { email },
                select: { id: true },
            }),
        ]);

        if (!workspace) {
            return { status: "NOT_FOUND" as const };
        }

        if (targetUser) {
            const existingMember = await tx.workspaceMember.findFirst({
                where: {
                    workspaceId,
                    userId: targetUser.id,
                },
                select: { id: true },
            });

            if (existingMember) {
                return { status: "ALREADY_MEMBER" as const };
            }
        }

        await tx.workspaceInvite.updateMany({
            where: {
                workspaceId,
                email,
                acceptedAt: null,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });

        const invite = await tx.workspaceInvite.create({
            data: {
                workspaceId,
                email,
                role,
                tokenHash,
                expiresAt,
                invitedById,
                projectAccesses: {
                    create: normalizedProjectAccesses.projectAccesses.map(
                        (projectAccess) => ({
                            workspaceId,
                            projectId: projectAccess.projectId,
                            environmentScope:
                                projectAccess.environmentScope,
                            environments: {
                                create: projectAccess.environments.map(
                                    (environment) => ({
                                        environment,
                                    })
                                ),
                            },
                        })
                    ),
                },
            },
            select: {
                id: true,
                workspaceId: true,
                email: true,
                role: true,
                expiresAt: true,
                createdAt: true,
                invitedBy: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                projectAccesses: {
                    select: {
                        projectId: true,
                        environmentScope: true,
                        project: {
                            select: {
                                name: true,
                            },
                        },
                        environments: {
                            select: {
                                environment: true,
                            },
                        },
                    },
                },
            },
        });

        const inviterEmail = formatUserEmail(inviter?.email, invitedById);

        await tx.workspaceHistory.create({
            data: {
                workspaceId,
                operation: "WORKSPACE_INVITE_CREATED",
                message: `${email} was invited by ${inviterEmail} as ${role}.`,
                data: {
                    workspace: {
                        id: workspace.id,
                        name: workspace.name,
                    },
                    target: {
                        email,
                    },
                    role,
                    projectAccesses:
                        normalizedProjectAccesses.projectAccesses,
                    actor: {
                        userId: invitedById,
                        email: inviterEmail,
                    },
                    expiresAt: expiresAt.toISOString(),
                },
            },
        });

        return {
            status: "OK" as const,
            invite,
            workspaceName: workspace.name,
            inviterEmail,
        };
    });

    if (result.status !== "OK") {
        return result;
    }

    logWorkspaceInviteEmail({
        email,
        workspaceName: result.workspaceName,
        inviterEmail: result.inviterEmail,
        role,
        token,
    });

    return {
        status: "OK",
        invite: serializeInviteRecord(result.invite),
    };
}

export async function acceptWorkspaceInvite({
    token,
    userId,
}: {
    token: string;
    userId: string;
}): Promise<
    | { status: "OK"; member: WorkspaceMemberSummary }
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
    | { status: "EXPIRED" }
    | { status: "ALREADY_MEMBER" }
> {
    const tokenHash = hashInviteToken(token);

    return prisma.$transaction(async (tx) => {
        const invite = await tx.workspaceInvite.findUnique({
            where: {
                tokenHash,
            },
            select: {
                id: true,
                workspaceId: true,
                email: true,
                role: true,
                invitedById: true,
                expiresAt: true,
                acceptedAt: true,
                revokedAt: true,
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                projectAccesses: {
                    select: {
                        projectId: true,
                        environmentScope: true,
                        environments: {
                            select: {
                                environment: true,
                            },
                        },
                    },
                },
            },
        });

        if (!invite || invite.acceptedAt || invite.revokedAt) {
            return { status: "NOT_FOUND" as const };
        }

        if (invite.expiresAt.getTime() <= Date.now()) {
            return { status: "EXPIRED" as const };
        }

        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        if (!user?.email || user.email.toLowerCase() !== invite.email) {
            return { status: "FORBIDDEN" as const };
        }

        const existingMember = await tx.workspaceMember.findFirst({
            where: {
                workspaceId: invite.workspaceId,
                userId,
            },
            select: { id: true },
        });

        if (existingMember) {
            return { status: "ALREADY_MEMBER" as const };
        }

        const workspaceMember = await tx.workspaceMember.create({
            data: {
                workspaceId: invite.workspaceId,
                userId,
                role: invite.role,
                projectAccessScope:
                    invite.role === "ADMIN"
                        ? "ALL_PROJECTS"
                        : "SELECTED_PROJECTS",
                addedById: invite.invitedById,
            },
            select: {
                id: true,
                workspaceId: true,
                userId: true,
                role: true,
                projectAccessScope: true,
                addedById: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatar: true,
                    },
                },
                addedBy: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
        });

        if (invite.role === "MEMBER") {
            for (const projectAccess of invite.projectAccesses) {
                const projectMember = await tx.projectMember.create({
                    data: {
                        workspaceId: invite.workspaceId,
                        projectId: projectAccess.projectId,
                        workspaceMemberId: workspaceMember.id,
                        role: "CONTRIBUTOR",
                        addedById: invite.invitedById,
                    },
                    select: {
                        id: true,
                    },
                });

                const environments =
                    projectAccess.environmentScope === "ALL_ENVIRONMENTS"
                        ? (
                            await tx.envFile.findMany({
                                where: {
                                    workspaceId: invite.workspaceId,
                                    projectId: projectAccess.projectId,
                                },
                                select: {
                                    environment: true,
                                },
                            })
                        ).map((envFile) => envFile.environment)
                        : projectAccess.environments.map(
                            (envAccess) => envAccess.environment
                        );

                if (environments.length > 0) {
                    await tx.projectEnvAccess.createMany({
                        data: Array.from(new Set(environments)).map(
                            (environment) => ({
                                workspaceId: invite.workspaceId,
                                projectId: projectAccess.projectId,
                                projectMemberId: projectMember.id,
                                environment,
                                grantedById: invite.invitedById,
                            })
                        ),
                        skipDuplicates: true,
                    });
                }
            }
        }

        await tx.workspaceInvite.update({
            where: {
                id: invite.id,
            },
            data: {
                acceptedAt: new Date(),
            },
        });

        const actorEmail = formatUserEmail(user.email, userId);

        await tx.workspaceHistory.create({
            data: {
                workspaceId: invite.workspaceId,
                operation: "WORKSPACE_INVITE_ACCEPTED",
                message: `${actorEmail} accepted an invitation to ${invite.workspace.name}.`,
                data: {
                    workspace: {
                        id: invite.workspace.id,
                        name: invite.workspace.name,
                    },
                    target: {
                        userId,
                        email: actorEmail,
                        workspaceMemberId: workspaceMember.id,
                    },
                    role: invite.role,
                    actor: {
                        userId,
                        email: actorEmail,
                    },
                    invite: {
                        id: invite.id,
                    },
                },
            },
        });

        return {
            status: "OK" as const,
            member: serializeMemberRecord(workspaceMember),
        };
    });
}

export async function updateWorkspaceMember({
    workspaceId,
    memberId,
    updaterUserId,
    role,
    projectAccessScope,
}: {
    workspaceId: string;
    memberId: string;
    updaterUserId: string;
    role?: WorkspaceRoleValue;
    projectAccessScope?: ProjectAccessScopeValue;
}): Promise<
    | { status: "OK"; member: WorkspaceMemberSummary }
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
> {
    const updaterMembership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            userId: updaterUserId,
        },
        select: { role: true },
    });

    if (!updaterMembership) {
        return { status: "NOT_FOUND" };
    }

    if (updaterMembership.role !== "OWNER" && updaterMembership.role !== "ADMIN") {
        return { status: "FORBIDDEN" };
    }

    const targetMember = await prisma.workspaceMember.findFirst({
        where: {
            id: memberId,
            workspaceId,
        },
    });

    if (!targetMember) {
        return { status: "NOT_FOUND" };
    }

    if (
        targetMember.role === "OWNER" &&
        updaterMembership.role !== "OWNER"
    ) {
        return { status: "FORBIDDEN" };
    }

    if (
        (targetMember.role === "OWNER" || targetMember.role === "ADMIN") &&
        projectAccessScope !== undefined
    ) {
        return { status: "FORBIDDEN" };
    }

    if (role === "OWNER") {
        return { status: "FORBIDDEN" };
    }

    const nextRole = role ?? targetMember.role;

    if (nextRole === "MEMBER" && projectAccessScope === "ALL_PROJECTS") {
        return { status: "FORBIDDEN" };
    }

    const updated = await prisma.workspaceMember.update({
        where: { id: memberId },
        data: {
            ...(role !== undefined
                ? {
                    role,
                    projectAccessScope:
                        role === "ADMIN" ? "ALL_PROJECTS" : "SELECTED_PROJECTS",
                }
                : {}),
            ...(projectAccessScope !== undefined
                ? { projectAccessScope }
                : {}),
        },
        select: {
            id: true,
            workspaceId: true,
            userId: true,
            role: true,
            projectAccessScope: true,
            addedById: true,
            createdAt: true,
            updatedAt: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatar: true,
                },
            },
            addedBy: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatar: true,
                },
            },
        },
    });

    return {
        status: "OK",
        member: serializeMemberRecord(updated),
    };
}

export async function removeWorkspaceMember({
    workspaceId,
    memberId,
    removerUserId,
}: {
    workspaceId: string;
    memberId: string;
    removerUserId: string;
}): Promise<
    | { status: "OK" }
    | { status: "NOT_FOUND" }
    | { status: "FORBIDDEN" }
> {
    const removerMembership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            userId: removerUserId,
        },
        select: { role: true },
    });

    if (!removerMembership) {
        return { status: "NOT_FOUND" };
    }

    if (removerMembership.role !== "OWNER" && removerMembership.role !== "ADMIN") {
        return { status: "FORBIDDEN" };
    }

    const targetMember = await prisma.workspaceMember.findFirst({
        where: {
            id: memberId,
            workspaceId,
        },
    });

    if (!targetMember) {
        return { status: "NOT_FOUND" };
    }

    if (
        targetMember.role === "OWNER" &&
        removerMembership.role !== "OWNER"
    ) {
        return { status: "FORBIDDEN" };
    }

    if (targetMember.userId === removerUserId) {
        return { status: "FORBIDDEN" };
    }

    await prisma.workspaceMember.delete({
        where: { id: memberId },
    });

    return { status: "OK" };
}
