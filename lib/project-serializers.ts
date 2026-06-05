import type {
    ProjectDetail,
    ProjectDetailRecord,
    ProjectEnvFile,
    ProjectEnvFileRecord,
    ProjectEnvVariable,
    ProjectEnvVariableRecord,
} from "@/types/project";

export function serializeProjectEnvVariable(
    record: ProjectEnvVariableRecord
): ProjectEnvVariable {
    return {
        id: record.id,
        key: record.key,
        value: record.value,
        note: record.note,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export function serializeProjectEnvFile(
    record: ProjectEnvFileRecord
): ProjectEnvFile {
    return {
        id: record.id,
        name: record.name,
        environment: record.environment,
        description: record.description,
        variableCount: record.variableCount,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        variables: record.variables.map(serializeProjectEnvVariable),
    };
}

export function serializeProjectDetail(record: ProjectDetailRecord): ProjectDetail {
    return {
        id: record.id,
        workspaceId: record.workspaceId,
        name: record.name,
        description: record.description,
        role: record.role,
        canManage: record.canManage,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        envFiles: record.envFiles.map(serializeProjectEnvFile),
    };
}
