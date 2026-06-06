import type {
    ProjectDetail,
    ProjectDetailRecord,
    ProjectEnvFile,
    ProjectEnvFileRecord,
    ProjectEnvVariable,
    ProjectEnvVariableMetadataRecord,
    ProjectEnvVariableRecord,
} from "@/types/project";

export function serializeProjectEnvVariable(
    record: ProjectEnvVariableRecord
): ProjectEnvVariable {
    const variable: ProjectEnvVariable = {
        id: record.id,
        key: record.key,
        note: record.note,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };

    if (typeof record.value === "string") {
        variable.value = record.value;
    }

    return variable;
}

export function serializeProjectEnvVariableMetadata(
    record: ProjectEnvVariableMetadataRecord
): ProjectEnvVariable {
    return {
        id: record.id,
        key: record.key,
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
        variables: record.variables.map(serializeProjectEnvVariableMetadata),
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
