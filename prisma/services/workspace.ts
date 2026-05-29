import { prisma } from "@/lib/prisma";
import { canViewHistory } from "@/lib/constants";
import type {
    CreateWorkspaceForUserInput,
    WorkspaceDetailRecord,
    WorkspaceSummaryRecord,
} from "@/types/workspace";

function toSlugBase(name: string) {
    const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

    return slug || "workspace";
}

function isUniqueConstraintError(error: unknown) {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    return "code" in error && (error as { code?: string }).code === "P2002";
}

function formatUserEmail(email: string | null | undefined, userId: string) {
    return email ?? `user:${userId}`;
}

function formatProjectAccessScope(scope: "ALL_PROJECTS" | "SELECTED_PROJECTS") {
    return scope === "ALL_PROJECTS" ? "all projects" : "selected projects";
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
                    slug: true,
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
                      slug: true,
                      createdAt: true,
                      updatedAt: true,
                  },
                  orderBy: {
                      updatedAt: "desc",
                  },
              })
            : (
                  await prisma.projectMember.findMany({
                      where: {
                          workspaceId,
                          workspaceMemberId: membership.id,
                      },
                      select: {
                          project: {
                              select: {
                                  id: true,
                                  name: true,
                                  slug: true,
                                  createdAt: true,
                                  updatedAt: true,
                              },
                          },
                      },
                  })
              ).map((projectMember) => projectMember.project);

    return {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        role: membership.role,
        projectAccessScope: membership.projectAccessScope,
        projectCount:
            membership.projectAccessScope === "ALL_PROJECTS"
                ? membership.workspace._count.projects
                : uniqueProjects.length,
        memberCount: membership.workspace._count.members,
        historyCount: canViewHistory(membership.role)
            ? membership.workspace._count.history
            : 0,
        projects: uniqueProjects,
    };
}

export async function createWorkspaceForUser(
    input: CreateWorkspaceForUserInput
): Promise<WorkspaceSummaryRecord> {
    const name = input.name.trim();
    const description = input.description?.trim() || null;
    const slugBase = toSlugBase(name);

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const slug = attempt === 0 ? slugBase : `${slugBase}-${attempt + 1}`;

        try {
            const workspace = await prisma.$transaction(async (tx) => {
                const creator = await tx.user.findUnique({
                    where: { id: input.userId },
                    select: { email: true },
                });
                const creatorEmail = formatUserEmail(creator?.email, input.userId);

                const createdWorkspace = await tx.workspace.create({
                    data: {
                        name,
                        slug,
                        description,
                        createdById: input.userId,
                    },
                });

                await tx.workspaceMember.create({
                    data: {
                        workspaceId: createdWorkspace.id,
                        userId: input.userId,
                        role: "OWNER",
                        projectAccessScope: "ALL_PROJECTS",
                        addedById: input.userId,
                    },
                });

                await tx.workspaceHistory.create({
                    data: {
                        workspaceId: createdWorkspace.id,
                        operation: "WORKSPACE_CREATED",
                        message: `Workspace "${createdWorkspace.name}" was created by ${creatorEmail}.`,
                        data: {
                            workspaceId: createdWorkspace.id,
                            createdByUserId: input.userId,
                            createdByEmail: creatorEmail,
                            name: createdWorkspace.name,
                            slug: createdWorkspace.slug,
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
                            workspaceId: createdWorkspace.id,
                            targetUserId: input.userId,
                            targetEmail: creatorEmail,
                            role: "OWNER",
                            projectAccessScope: "ALL_PROJECTS",
                            addedByUserId: input.userId,
                            addedByEmail: creatorEmail,
                        },
                    },
                });

                return createdWorkspace;
            });

            return {
                id: workspace.id,
                name: workspace.name,
            };
        } catch (error) {
            if (isUniqueConstraintError(error)) {
                continue;
            }

            throw error;
        }
    }

    throw new Error("Unable to create workspace with a unique slug.");
}
