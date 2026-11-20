import type { MemberProjectAccessInput } from "@/types/member";
import type { ProjectRoleValue } from "@/types/project";
import type { EnvironmentAccessScopeValue, EnvironmentTypeValue } from "@/types/workspace";

export type ServiceAccountToken = {
    id: string;
    name: string;
    tokenPrefix: string;
    expiresAt: string | null;
    lastUsedAt: string | null;
    createdAt: string;
};

export type ServiceAccountProjectAccess = {
    projectId: string;
    projectName: string;
    role: ProjectRoleValue;
    environmentAccessScope: EnvironmentAccessScopeValue;
    environments: EnvironmentTypeValue[];
};

export type ServiceAccountSummary = {
    id: string;
    userId: string;
    name: string;
    createdAt: string;
    createdByEmail: string | null;
    signPublicKey: string;
    boxPublicKey: string;
    sealedSeed: string | null;
    projects: ServiceAccountProjectAccess[];
    tokens: ServiceAccountToken[];
};

export type ServiceAccountsResponse = {
    serviceAccounts: ServiceAccountSummary[];
};

export type CreateServiceAccountBody = {
    name?: unknown;
    signPublicKey?: unknown;
    boxPublicKey?: unknown;
    sealedSeed?: unknown;
    projects?: unknown;
};

export type CreateServiceAccountInput = {
    workspaceId: string;
    actorUserId: string;
    name: string;
    signPublicKey: string;
    boxPublicKey: string;
    sealedSeed: string;
    projects: MemberProjectAccessInput[];
};

export type CreateServiceAccountTokenBody = {
    name?: unknown;
    tokenHash?: unknown;
    tokenPrefix?: unknown;
    encryptedServerShare?: unknown;
    expiresInDays?: unknown;
};

export type ServiceAccountRouteContext = {
    params: Promise<{
        workspaceId: string;
        serviceAccountId: string;
    }>;
};

export type ServiceAccountTokenRouteContext = {
    params: Promise<{
        workspaceId: string;
        serviceAccountId: string;
        tokenId: string;
    }>;
};

export type ServiceAccountDraftProject = {
    projectId: string;
    role: "VIEWER" | "CONTRIBUTOR";
    environments: EnvironmentTypeValue[];
};

export type ServiceAccountFormProps = {
    workspaceId: string;
    projects: { id: string; name: string }[];
    isPending: boolean;
    onSubmit: (input: { name: string; projects: ServiceAccountDraftProject[] }) => void;
};

export type ServiceAccountCardProps = {
    account: ServiceAccountSummary;
    isBusy: boolean;
    onCreateToken: (account: ServiceAccountSummary, name: string, expiresInDays: number) => void;
    onRevokeToken: (account: ServiceAccountSummary, tokenId: string) => void;
    onDelete: (account: ServiceAccountSummary) => void;
};

export type NewTokenNoticeProps = {
    accountName: string;
    token: string;
    onDismiss: () => void;
};
