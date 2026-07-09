import { prisma } from "@/lib/prisma";
import { canViewHistory } from "@/constants/access";
import type { Prisma } from "@/prisma/generated/client";
import type {
    CreateWorkspaceHistoryEntryInput,
    GetWorkspaceHistoryEntryForUserInput,
    ListWorkspaceHistoryForUserInput,
    ListWorkspaceHistoryForUserResult,
} from "@/types/workspace";

const HISTORY_PAGE_SIZE = 20;

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

export async function listWorkspaceHistoryForUser(
    input: ListWorkspaceHistoryForUserInput
): Promise<ListWorkspaceHistoryForUserResult> {
    const membership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId: input.workspaceId,
            userId: input.userId,
        },
        select: {
            role: true,
        },
    });

    if (!membership) {
        return {
            status: "NOT_FOUND",
        };
    }

    if (!canViewHistory(membership.role)) {
        return {
            status: "FORBIDDEN",
        };
    }

    const query = input.query?.trim();
    const cursor = input.cursor?.trim();
    const historyWhere: Prisma.WorkspaceHistoryWhereInput = {
        workspaceId: input.workspaceId,
        ...(query
            ? {
                  OR: [
                      {
                          message: {
                              contains: query,
                              mode: "insensitive",
                          },
                      },
                      {
                          operation: {
                              contains: query,
                              mode: "insensitive",
                          },
                      },
                  ],
              }
            : {}),
    };

    if (cursor) {
        const cursorEntry = await prisma.workspaceHistory.findFirst({
            where: {
                ...historyWhere,
                id: cursor,
            },
            select: {
                id: true,
            },
        });

        if (!cursorEntry) {
            return {
                status: "INVALID_CURSOR",
            };
        }
    }

    const entries = await prisma.workspaceHistory.findMany({
        where: historyWhere,
        select: {
            id: true,
            operation: true,
            message: true,
            createdAt: true,
        },
        orderBy: [
            {
                createdAt: "desc",
            },
            {
                id: "desc",
            },
        ],
        ...(cursor
            ? {
                  cursor: {
                      id: cursor,
                  },
                  skip: 1,
              }
            : {}),
        take: HISTORY_PAGE_SIZE + 1,
    });
    const pageEntries = entries.slice(0, HISTORY_PAGE_SIZE);
    const hasMore = entries.length > HISTORY_PAGE_SIZE;

    return {
        status: "OK",
        entries: pageEntries,
        hasMore,
        nextCursor: hasMore ? pageEntries.at(-1)?.id ?? null : null,
    };
}

export async function getWorkspaceHistoryEntryForUser(
    input: GetWorkspaceHistoryEntryForUserInput
) {
    const membership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId: input.workspaceId,
            userId: input.userId,
        },
        select: {
            role: true,
        },
    });

    if (!membership) {
        return {
            status: "NOT_FOUND" as const,
        };
    }

    if (!canViewHistory(membership.role)) {
        return {
            status: "FORBIDDEN" as const,
        };
    }

    const entry = await prisma.workspaceHistory.findFirst({
        where: {
            id: input.historyId,
            workspaceId: input.workspaceId,
        },
        select: {
            id: true,
            workspaceId: true,
            operation: true,
            message: true,
            data: true,
            createdAt: true,
        },
    });

    if (!entry) {
        return {
            status: "NOT_FOUND" as const,
        };
    }

    return {
        status: "OK" as const,
        entry,
    };
}
