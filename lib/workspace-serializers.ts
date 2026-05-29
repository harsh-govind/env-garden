import type {
    WorkspaceDetailRecord,
    WorkspaceSummaryRecord,
} from "@/types/workspace";
import type {
    WorkspaceDetail,
    WorkspaceHistoryEntry,
    WorkspaceSummary,
} from "@/types/workspace";

function toRecord(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }

    return {
        value,
    };
}

function getHistoryMessage(
    operation: string,
    entryMessage: string,
    data: Record<string, unknown>
) {
    if (entryMessage.trim().length > 0) {
        return entryMessage;
    }

    const message = data.message;

    if (typeof message === "string" && message.trim().length > 0) {
        return message;
    }

    return operation;
}

function serializeWorkspaceHistoryEntry(
    entry: WorkspaceDetailRecord["history"][number]
): WorkspaceHistoryEntry {
    const data = toRecord(entry.data);

    return {
        id: entry.id,
        operation: entry.operation,
        message: getHistoryMessage(entry.operation, entry.message, data),
        data,
        createdAt: entry.createdAt.toISOString(),
    };
}

export function serializeWorkspaceSummary(
    record: WorkspaceSummaryRecord
): WorkspaceSummary {
    return {
        id: record.id,
        name: record.name,
        slug: record.slug,
        description: record.description,
        role: record.role,
        projectAccessScope: record.projectAccessScope,
        projectCount: record.projectCount,
        memberCount: record.memberCount,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export function serializeWorkspaceDetail(
    record: WorkspaceDetailRecord
): WorkspaceDetail {
    return {
        ...serializeWorkspaceSummary(record),
        projects: record.projects.map((project) => ({
            id: project.id,
            name: project.name,
            slug: project.slug,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
        })),
        history: record.history.map(serializeWorkspaceHistoryEntry),
    };
}
