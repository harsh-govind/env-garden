import { prisma } from "@/lib/prisma";
import type { CreateWorkspaceHistoryEntryInput } from "@/types/workspace";

function formatUserEmail(email: string | null | undefined, userId: string) {
    return email ?? `user:${userId}`;
}

export async function createProjectForWorkspace(
    input: {
        workspaceId: string;
        userId: string;
        name: string;
        description?: string | null;
    }
) {
    const name = input.name.trim();
    const description = input.description?.trim() || null;

    const project = await prisma.$transaction(async (tx) => {
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

        await tx.projectMember.create({
            data: {
                workspaceId: input.workspaceId,
                projectId: createdProject.id,
                workspaceMemberId: member.id,
                role: "OWNER",
                addedById: input.userId,
            },
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

        return createdProject;
    });

    return project;
}
