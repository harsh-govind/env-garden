import { prisma } from "@/lib/prisma";
import type { CreateWorkspaceHistoryEntryInput } from "@/types/workspace";

export async function createWorkspaceHistoryEntry(
    input: CreateWorkspaceHistoryEntryInput
) {
    return prisma.workspaceHistory.create({
        data: {
            workspaceId: input.workspaceId,
            operation: input.operation,
            message: input.message,
            data: input.data,
        },
    });
}
