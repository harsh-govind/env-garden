import { prisma } from "@/lib/prisma";
import { canViewHistory } from "@/lib/constants";
import { findMostRecentUpdatedAt } from "@/lib/updated-at";
import type {
    CreateWorkspaceForUserInput,
    WorkspaceDetailRecord,
    WorkspaceProjectUpdatedAtRecord,
    WorkspaceSummaryRecord,
} from "@/types/workspace";

function formatUserEmail(email: string | null | undefined, userId: string) {
    return email ?? `user:${userId}`;
}

function formatProjectAccessScope(scope: "ALL_PROJECTS" | "SELECTED_PROJECTS") {
    return scope === "ALL_PROJECTS" ? "all projects" : "selected projects";
}

function getMostRecentProjectUpdatedAtTime(
    project: WorkspaceProjectUpdatedAtRecord
) {
    return (
        findMostRecentUpdatedAt(
            project,
            project.envFiles,
            project.envFiles.map((envFile) => envFile.variables)
        ) ?? project.updatedAt
    ).getTime();
}

function sortProjectsByMostRecentUpdatedAt<
    TProject extends WorkspaceProjectUpdatedAtRecord,
>(projects: TProject[]) {
    return [...projects].sort(
        (a, b) =>
            getMostRecentProjectUpdatedAtTime(b) -
            getMostRecentProjectUpdatedAtTime(a)
    );
}

export async function listWorkspacesForUser(userId: string): Promise<WorkspaceSummaryRecord[]> {
    const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        select: {
            workspace: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
    }));
}

export async function getWorkspaceDetailForUser(
    workspaceId: string,
    userId: string
): Promise<WorkspaceDetailRecord | null> {
    const membership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            userId,
        },
        select: {
            id: true,
            role: true,
            projectAccessScope: true,
            workspace: {
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: {
                            members: true,
                            projects: true,
                            history: true,
                        },
                    },
                },
            },
        },
    });

    if (!membership) {
        return null;
    }

    const uniqueProjects =
        membership.projectAccessScope === "ALL_PROJECTS"
            ? await prisma.project.findMany({
                  where: {
                      workspaceId,
                  },
                  select: {
                      id: true,
                      name: true,
                      updatedAt: true,
                      envFiles: {
                          select: {
                              updatedAt: true,
                              variables: {
                                  orderBy: {
                                      updatedAt: "desc",
                                  },
                                  take: 1,
                                  select: {
                                      updatedAt: true,
                                  },
                              },
                          },
                      },
                  },
              })
            : (
                  await prisma.projectMember.findMany({
                      where: {
                          workspaceId,
                          workspaceMemberId: membership.id,
                      },
                      select: {
                          role: true,
                          environmentAccessScope: true,
                          envAccesses: {
                              select: {
                                  environment: true,
                              },
                          },
                          project: {
                              select: {
                                  id: true,
                                  name: true,
                                  updatedAt: true,
                                  envFiles: {
                                      select: {
                                          environment: true,
                                          updatedAt: true,
                                          variables: {
                                              orderBy: {
                                                  updatedAt: "desc",
                                              },
                                              take: 1,
                                              select: {
                                                  updatedAt: true,
                                              },
                                          },
                                      },
                                  },
                              },
                          },
                      },
                  })
              ).map((projectMember) => {
                  const canViewAllEnvFiles =
                      membership.role === "OWNER" ||
                      membership.role === "ADMIN" ||
                      projectMember.role === "OWNER" ||
                      projectMember.environmentAccessScope === "ALL_ENVIRONMENTS";
                  const accessibleEnvironments = new Set(
                      projectMember.envAccesses.map(
                          (envAccess) => envAccess.environment
                      )
                  );
                  const envFiles = projectMember.project.envFiles
                      .filter(
                          (envFile) =>
                              canViewAllEnvFiles ||
                              accessibleEnvironments.has(envFile.environment)
                      )
                      .map((envFile) => ({
                          updatedAt: envFile.updatedAt,
                          variables: envFile.variables,
                      }));

                  return {
                      id: projectMember.project.id,
                      name: projectMember.project.name,
                      updatedAt: projectMember.project.updatedAt,
                      envFiles,
                  };
              });
    const projects = sortProjectsByMostRecentUpdatedAt(uniqueProjects);

    return {
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
        projectAccessScope: membership.projectAccessScope,
        projectCount:
            membership.projectAccessScope === "ALL_PROJECTS"
                ? membership.workspace._count.projects
                : projects.length,
        memberCount: membership.workspace._count.members,
        historyCount: canViewHistory(membership.role)
            ? membership.workspace._count.history
            : 0,
        projects,
    };
}

export async function createWorkspaceForUser(
    input: CreateWorkspaceForUserInput
): Promise<WorkspaceSummaryRecord> {
    const name = input.name.trim();
    const description = input.description?.trim() || null;
    const workspace = await prisma.$transaction(async (tx) => {
        const creator = await tx.user.findUnique({
            where: { id: input.userId },
            select: { email: true },
        });
        const creatorEmail = formatUserEmail(creator?.email, input.userId);

        const createdWorkspace = await tx.workspace.create({
            data: {
                name,
                description,
                createdById: input.userId,
            },
        });

        const createdWorkspaceMember = await tx.workspaceMember.create({
            data: {
                workspaceId: createdWorkspace.id,
                userId: input.userId,
                role: "OWNER",
                projectAccessScope: "ALL_PROJECTS",
                defaultProjectRole: "OWNER",
                defaultEnvironmentAccessScope: "ALL_ENVIRONMENTS",
                addedById: input.userId,
            },
            select: {
                id: true,
                workspaceId: true,
                userId: true,
                role: true,
                projectAccessScope: true,
            },
        });

        await tx.workspaceHistory.create({
            data: {
                workspaceId: createdWorkspace.id,
                operation: "WORKSPACE_CREATED",
                message: `Workspace "${createdWorkspace.name}" was created by ${creatorEmail}.`,
                data: {
                    workspace: {
                        id: createdWorkspace.id,
                        name: createdWorkspace.name,
                    },
                    actor: {
                        userId: input.userId,
                        email: creatorEmail,
                    },
                    hasDescription: Boolean(description),
                },
            },
        });

        await tx.workspaceHistory.create({
            data: {
                workspaceId: createdWorkspace.id,
                operation: "WORKSPACE_MEMBER_ADDED",
                message: `${creatorEmail} was added by ${creatorEmail} as OWNER with project access to ${formatProjectAccessScope(
                    "ALL_PROJECTS"
                )}.`,
                data: {
                    workspace: {
                        id: createdWorkspace.id,
                        name: createdWorkspace.name,
                    },
                    target: {
                        userId: input.userId,
                        email: creatorEmail,
                        workspaceMemberId: createdWorkspaceMember.id,
                    },
                    role: "OWNER",
                    projectAccessScope: "ALL_PROJECTS",
                    actor: {
                        userId: input.userId,
                        email: creatorEmail,
                    },
                },
            },
        });

        return createdWorkspace;
    });

    return {
        id: workspace.id,
        name: workspace.name,
    };
}
