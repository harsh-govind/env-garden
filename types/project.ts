import type { EncryptedVariable } from "@/types/crypto";
import type {
    EnvironmentTypeValue,
    ProjectAccessScopeValue,
    EnvironmentAccessScopeValue,
    WorkspaceRoleValue,
} from "@/types/workspace";

export type ProjectRoleValue = "OWNER" | "CONTRIBUTOR" | "VIEWER";

export type ProjectEnvVariableCipher = EncryptedVariable & {
    id: string;
    position: number;
    createdAt: string;
    updatedAt: string;
};

export type ProjectEnvVariableCipherRecord = Omit<
    ProjectEnvVariableCipher,
    "createdAt" | "updatedAt"
> & {
    createdAt: Date;
    updatedAt: Date;
};

export type ProjectEnvVariable = {
    id: string;
    key: string;
    value: string;
    note: string | null;
    isCommented: boolean;
    position: number;
    createdAt: string;
    updatedAt: string;
};

export type EnvironmentKeyShareInfo = {
    version: number;
    recipientBoxPublicKey: string;
    sealedSecret: string;
    signature: string;
    granter: {
        userId: string | null;
        email: string | null;
        signPublicKey: string;
    };
};

export type ProjectEnvironmentKey = {
    id: string;
    environment: EnvironmentTypeValue;
    version: number;
    rotationRequired: boolean;
    share: EnvironmentKeyShareInfo | null;
};

export type ProjectEnvironmentKeyRecord = Omit<ProjectEnvironmentKey, "share"> & {
    share: (Omit<EnvironmentKeyShareInfo, "granter"> & {
        granter: EnvironmentKeyShareInfo["granter"];
    }) | null;
};

export type NewEnvironmentKeyInput = {
    id: string;
    environment: EnvironmentTypeValue;
    sealedSecret: string;
    signature: string;
};

export type VariableDraftRow = {
    clientId: string;
    variableId?: string;
    key: string;
    value: string;
    originalValue: string;
    isValueEditable: boolean;
    note: string;
    isNoteOpen: boolean;
    isCommented: boolean;
};

export type ParsedEnvRow = Pick<VariableDraftRow, "key" | "value" | "note" | "isCommented">;

export type ProjectEnvFile = {
    id: string;
    name: string;
    environment: EnvironmentTypeValue;
    description: string | null;
    variableCount: number;
    createdAt: string;
    updatedAt: string;
    variables: ProjectEnvVariableCipher[];
};

export type ProjectEnvFileRecord = Omit<
    ProjectEnvFile,
    "createdAt" | "updatedAt" | "variables"
> & {
    createdAt: Date;
    updatedAt: Date;
    variables: ProjectEnvVariableCipherRecord[];
};

export type ProjectDetail = {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    role: ProjectRoleValue | null;
    canManage: boolean;
    envFiles: ProjectEnvFile[];
    environmentKeys: ProjectEnvironmentKey[];
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
        environmentAccessScope: EnvironmentAccessScopeValue;
        envAccesses: {
            environment: string;
        }[];
    } | null;
    projectRole: ProjectRoleValue;
    workspaceMember: {
        id: string;
        role: WorkspaceRoleValue;
        projectAccessScope: ProjectAccessScopeValue;
        defaultProjectRole: ProjectRoleValue;
    };
};

export type ProjectDetailResponse = {
    project: ProjectDetail;
};

export type CreateEnvFileRequest = {
    name?: string;
    environment: EnvironmentTypeValue;
    description?: string;
    environmentKey?: Omit<NewEnvironmentKeyInput, "environment">;
};

export type CreateEnvFileResponse = {
    envFile: ProjectEnvFile;
    environmentKey: ProjectEnvironmentKey | null;
};

export type CreateEnvFileBody = {
    name?: unknown;
    environment?: unknown;
    description?: unknown;
    environmentKey?: unknown;
};

export type RenameEnvFileRequest = {
    name: string;
};

export type RenameEnvFileBody = {
    name?: unknown;
};

export type RenameEnvFileResponse = {
    envFile: ProjectEnvFile;
};

export type DeleteEnvFileResponse = {
    success: true;
};

export type SaveEnvVariablesRequest = {
    variables: EncryptedVariable[];
};

export type SaveEnvVariablesResponse = {
    variables: ProjectEnvVariableCipher[];
};

export type EnvVariablesCipherResponse = {
    variables: ProjectEnvVariableCipher[];
    environmentKey: ProjectEnvironmentKey;
};

export type SaveEnvVariablesBody = {
    variables?: unknown;
};

export type RenameProjectRequest = {
    name: string;
};

export type RenameProjectBody = {
    name?: unknown;
};

export type RenameProjectResponse = {
    project: {
        id: string;
        name: string;
        updatedAt: string;
    };
};

export type DeleteProjectResponse = {
    success: true;
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
