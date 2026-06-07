import type {
    WorkspaceDetailRecord,
    WorkspaceSummaryRecord,
} from "@/types/workspace";
import type {
    WorkspaceDetail,
    WorkspaceSummary,
} from "@/types/workspace";
import { findMostRecentUpdatedAt } from "@/lib/updated-at";

export function serializeWorkspaceSummary(
    record: WorkspaceSummaryRecord
): WorkspaceSummary {
    return {
        id: record.id,
        name: record.name,
    };
}

export function serializeWorkspaceDetail(
    record: WorkspaceDetailRecord
): WorkspaceDetail {
    return {
        id: record.id,
        name: record.name,
        role: record.role,
        projectAccessScope: record.projectAccessScope,
        projectCount: record.projectCount,
        memberCount: record.memberCount,
        historyCount: record.historyCount,
        projects: record.projects.map((project) => ({
            id: project.id,
            name: project.name,
            updatedAt: (
                findMostRecentUpdatedAt(
                    project,
                    project.envFiles,
                    project.envFiles.map((envFile) => envFile.variables)
                ) ?? project.updatedAt
            ).toISOString(),
        })),
    };
}
