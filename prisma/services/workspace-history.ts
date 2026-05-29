import { prisma } from "@/lib/prisma";
import { canViewHistory } from "@/lib/constants";
import type { CreateWorkspaceHistoryEntryInput } from "@/types/workspace";

const HISTORY_LIMIT = 100;

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

type ListWorkspaceHistoryForUserInput = {
    workspaceId: string;
    userId: string;
    query?: string;
};

type ListWorkspaceHistoryForUserResult =
    | {
          status: "NOT_FOUND";
      }
    | {
          status: "FORBIDDEN";
      }
    | {
          status: "OK";
          entries: {
              id: string;
              operation: string;
              message: string;
              data: unknown;
              createdAt: Date;
          }[];
      };

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

    const entries = await prisma.workspaceHistory.findMany({
        where: {
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
        },
        select: {
            id: true,
            operation: true,
            message: true,
            data: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: HISTORY_LIMIT,
    });

    return {
        status: "OK",
        entries,
    };
}
