import type { Prisma } from "@/prisma/generated/client";
import type { ProjectAccessContext } from "@/types/project";

export function canManageProject(context: ProjectAccessContext) {
    return (
        context.workspaceMember.role === "OWNER" ||
        context.workspaceMember.role === "ADMIN" ||
        context.projectRole === "OWNER"
    );
}

export function hasEnvironmentAccess(
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

export function canEditEnvironment(context: ProjectAccessContext, environment: string) {
    return (
        canManageProject(context) ||
        (context.projectRole === "CONTRIBUTOR" &&
            hasEnvironmentAccess(context, environment))
    );
}

export async function getProjectAccessContext(
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

export async function loadWorkspacePermissionIndex(
    tx: Prisma.TransactionClient,
    workspaceId: string
) {
    const workspaceMembers = await tx.workspaceMember.findMany({
        where: { workspaceId },
        select: {
            id: true,
            userId: true,
            role: true,
            defaultProjectRole: true,
            projectAccessScope: true,
            projectMembers: {
                select: {
                    id: true,
                    projectId: true,
                    role: true,
                    environmentAccessScope: true,
                    envAccesses: {
                        select: {
                            environment: true,
                        },
                    },
                },
            },
        },
    });
    const membersByUserId = new Map(workspaceMembers.map((member) => [member.userId, member]));

    function getContext(userId: string, projectId: string): ProjectAccessContext | null {
        const workspaceMember = membersByUserId.get(userId);

        if (!workspaceMember) {
            return null;
        }

        const projectMember = workspaceMember.projectMembers.find(
            (candidate) => candidate.projectId === projectId
        ) ?? null;

        if (workspaceMember.projectAccessScope !== "ALL_PROJECTS" && !projectMember) {
            return null;
        }

        return {
            project: { id: projectId, name: "" },
            projectMember,
            projectRole: projectMember?.role ?? workspaceMember.defaultProjectRole,
            workspaceMember: {
                id: workspaceMember.id,
                role: workspaceMember.role,
                projectAccessScope: workspaceMember.projectAccessScope,
                defaultProjectRole: workspaceMember.defaultProjectRole,
            },
        };
    }

    return {
        userIds: [...membersByUserId.keys()],
        canAccess(userId: string, projectId: string, environment: string) {
            const context = getContext(userId, projectId);
            return context ? hasEnvironmentAccess(context, environment) : false;
        },
    };
}
