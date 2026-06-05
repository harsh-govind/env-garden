import type { EncryptedValuePayload } from "@/types/encryption";
import type {
    EnvironmentTypeValue,
    ProjectAccessScopeValue,
    WorkspaceRoleValue,
} from "@/types/workspace";

export type ProjectRoleValue = "OWNER" | "ADMIN" | "CONTRIBUTOR" | "VIEWER";

export type ProjectEnvVariable = {
    id: string;
    key: string;
    value: string;
    note: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ProjectEnvVariableRecord = Omit<
    ProjectEnvVariable,
    "createdAt" | "updatedAt"
> & {
    createdAt: Date;
    updatedAt: Date;
};

export type ProjectEnvVariableEncryptedRecord = Omit<
    ProjectEnvVariableRecord,
    "value"
> &
    EncryptedValuePayload;

export type VariableDraftRow = {
    clientId: string;
    key: string;
    value: string;
    note: string;
    isNoteOpen: boolean;
};

export type ParsedEnvRow = Pick<VariableDraftRow, "key" | "value" | "note">;

export type ProjectEnvFile = {
    id: string;
    name: string;
    environment: EnvironmentTypeValue;
    description: string | null;
    variableCount: number;
    createdAt: string;
    updatedAt: string;
    variables: ProjectEnvVariable[];
};

export type ProjectEnvFileRecord = Omit<
    ProjectEnvFile,
    "createdAt" | "updatedAt" | "variables"
> & {
    createdAt: Date;
    updatedAt: Date;
    variables: ProjectEnvVariableRecord[];
};

export type ProjectDetail = {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    role: ProjectRoleValue | null;
    canManage: boolean;
    envFiles: ProjectEnvFile[];
    createdAt: string;
    updatedAt: string;
};

export type ProjectDetailRecord = Omit<
    ProjectDetail,
    "createdAt" | "updatedAt" | "envFiles"
> & {
    createdAt: Date;
    updatedAt: Date;
    envFiles: ProjectEnvFileRecord[];
};

export type ProjectAccessContext = {
    project: {
        id: string;
        name: string;
    };
    projectMember: {
        id: string;
        role: ProjectRoleValue;
        envAccesses: {
            environment: string;
        }[];
    } | null;
    workspaceMember: {
        id: string;
        role: WorkspaceRoleValue;
        projectAccessScope: ProjectAccessScopeValue;
    };
};

export type ProjectDetailResponse = {
    project: ProjectDetail;
};

export type CreateEnvFileRequest = {
    name?: string;
    environment: EnvironmentTypeValue;
    description?: string;
};

export type CreateEnvFileResponse = {
    envFile: ProjectEnvFile;
};

export type CreateEnvFileBody = {
    name?: unknown;
    environment?: unknown;
    description?: unknown;
};

export type CreateEnvVariableRequest = {
    key: string;
    value: string;
    note?: string;
};

export type CreateEnvVariableResponse = {
    variable: ProjectEnvVariable;
};

export type SaveEnvVariablesRequest = {
    variables: {
        key: string;
        value: string;
        note?: string | null;
    }[];
};

export type SaveEnvVariablesResponse = {
    variables: ProjectEnvVariable[];
};

export type CreateEnvVariableBody = {
    key?: unknown;
    value?: unknown;
    note?: unknown;
};

export type SaveEnvVariablesBody = {
    variables?: unknown;
};

export type ProjectRouteContext = {
    params: Promise<{
        workspaceId: string;
        projectId: string;
    }>;
};

export type ProjectEnvFileRouteContext = {
    params: Promise<{
        workspaceId: string;
        projectId: string;
        envFileId: string;
    }>;
};
