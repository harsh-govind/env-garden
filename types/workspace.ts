import type { LucideIcon } from "lucide-react";
import type { Prisma } from "@/prisma/generated/client";

export type WorkspaceRoleValue = "OWNER" | "ADMIN" | "MEMBER";

export type ProjectAccessScopeValue = "ALL_PROJECTS" | "SELECTED_PROJECTS";

export type InviteEnvironmentScopeValue =
    | "ALL_ENVIRONMENTS"
    | "SELECTED_ENVIRONMENTS";

export type EnvironmentTypeValue =
    | "PRODUCTION"
    | "STAGING"
    | "BETA"
    | "DEVELOPMENT"
    | "QA"
    | "TESTING"
    | "UAT"
    | "SANDBOX"
    | "PREVIEW"
    | "DEMO"
    | "CANARY"
    | "LOCAL"
    | "OTHER_1"
    | "OTHER_2"
    | "OTHER_3"
    | "OTHER_4"
    | "OTHER_5"
    | "OTHER_6"
    | "OTHER_7"
    | "OTHER_8"
    | "OTHER_9";

export type EnvironmentTypeOption = {
    key: EnvironmentTypeValue;
    label: string;
    shortDescription: string;
    color: string;
};

export type WorkspaceProjectSummary = {
    id: string;
    name: string;
    updatedAt: string;
};

export type WorkspaceInviteProjectOption = {
    id: string;
    name: string;
    environments: EnvironmentTypeValue[];
};

export type WorkspaceProjectUpdatedAtRecord = {
    updatedAt: Date;
    envFiles: {
        updatedAt: Date;
        variables: {
            updatedAt: Date;
        }[];
    }[];
};

export type WorkspaceHistoryEntry = {
    id: string;
    operation: string;
    message: string;
    createdAt: string;
};

export type WorkspaceHistoryDetail = WorkspaceHistoryEntry & {
    workspaceId: string;
    data: Prisma.JsonValue;
};

export type WorkspaceHistoryCacheEntry = {
    history: WorkspaceHistoryEntry[];
    hasMore: boolean;
    nextCursor: string | null;
};

export type WorkspaceSummary = {
    id: string;
    name: string;
};

export type WorkspaceDetail = {
    id: string;
    name: string;
    role: WorkspaceRoleValue;
    projectAccessScope: ProjectAccessScopeValue;
    projectCount: number;
    memberCount: number;
    historyCount: number;
    projects: WorkspaceProjectSummary[];
};

export type CreateWorkspaceRequest = {
    name: string;
    description?: string;
};

export type WorkspacesResponse = {
    workspaces: WorkspaceSummary[];
};

export type WorkspaceResponse = {
    workspace: WorkspaceDetail;
};

export type CreateWorkspaceResponse = {
    workspaceId: string;
};

export type CreateProjectRequest = {
    workspaceId: string;
    name: string;
    description?: string;
    environments?: EnvironmentTypeValue[];
};

export type CreateProjectResponse = {
    project: WorkspaceProjectSummary;
    projectId: string;
    envFileCount?: number;
};

export type WorkspaceHistoryResponse = {
    history: WorkspaceHistoryEntry[];
    hasMore: boolean;
    nextCursor: string | null;
};

export type WorkspaceHistoryDetailResponse = {
    history: WorkspaceHistoryDetail;
};

export type WorkspaceContextValue = {
    workspaces: WorkspaceSummary[];
    activeWorkspaceId: string | null;
    activeWorkspace: WorkspaceDetail | null;
    isLoading: boolean;
    isWorkspaceLoading: boolean;
    isCreatingWorkspace: boolean;
    isCreatingProject?: boolean;
    error: string | null;
    selectWorkspace: (workspaceId: string) => void;
    refreshWorkspaces: () => Promise<void>;
    createWorkspace: (input: CreateWorkspaceRequest) => Promise<void>;
    createProject?: (input: CreateProjectRequest) => Promise<void>;
};

export type ApiErrorPayload = {
    error?: string;
};

export type CreateWorkspaceBody = {
    name?: unknown;
    description?: unknown;
};

export type CreateProjectBody = {
    name?: unknown;
    description?: unknown;
    environments?: unknown;
};

export type WorkspaceRouteContext = {
    params: Promise<{
        workspaceId: string;
    }>;
};

export type WorkspaceHistoryPageProps = {
    params: Promise<{
        workspaceId: string;
    }>;
};

export type WorkspaceHistoryEntryRouteContext = {
    params: Promise<{
        workspaceId: string;
        historyId: string;
    }>;
};

export type WorkspaceSummaryRecord = {
    id: string;
    name: string;
};

export type WorkspaceDetailRecord = {
    id: string;
    name: string;
    role: WorkspaceRoleValue;
    projectAccessScope: ProjectAccessScopeValue;
    projectCount: number;
    memberCount: number;
    historyCount: number;
    projects: (WorkspaceProjectUpdatedAtRecord & {
        id: string;
        name: string;
    })[];
};

export type CreateWorkspaceForUserInput = {
    userId: string;
    name: string;
    description?: string | null;
};

export type WorkspaceMemberRecord = {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRoleValue;
    projectAccessScope: ProjectAccessScopeValue;
    addedById: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: string;
        email: string | null;
        name: string | null;
        avatar: string;
    };
    addedBy: {
        id: string;
        email: string | null;
        name: string | null;
        avatar: string;
    } | null;
};

export type WorkspaceMemberSummary = {
    id: string;
    userId: string;
    email: string | null;
    name: string | null;
    avatar: string;
    role: WorkspaceRoleValue;
    projectAccessScope: ProjectAccessScopeValue;
    addedBy: {
        id: string;
        name: string | null;
        email: string | null;
    } | null;
    createdAt: string;
};

export type WorkspaceInviteProjectAccessInput = {
    projectId: string;
    environmentScope: InviteEnvironmentScopeValue;
    environments?: EnvironmentTypeValue[];
};

export type WorkspaceInviteProjectAccessSummary = {
    projectId: string;
    projectName: string;
    environmentScope: InviteEnvironmentScopeValue;
    environments: EnvironmentTypeValue[];
};

export type WorkspaceInviteRecord = {
    id: string;
    workspaceId: string;
    email: string;
    role: WorkspaceRoleValue;
    expiresAt: Date;
    createdAt: Date;
    invitedBy: {
        id: string;
        email: string | null;
        name: string | null;
    };
    projectAccesses: {
        projectId: string;
        environmentScope: InviteEnvironmentScopeValue;
        project: {
            name: string;
        };
        environments: {
            environment: string;
        }[];
    }[];
};

export type WorkspaceInviteSummary = {
    id: string;
    email: string;
    role: WorkspaceRoleValue;
    invitedBy: {
        id: string;
        name: string | null;
        email: string | null;
    };
    projectAccesses: WorkspaceInviteProjectAccessSummary[];
    expiresAt: string;
    createdAt: string;
};

export type WorkspaceMembersResponse = {
    members: WorkspaceMemberSummary[];
    invites: WorkspaceInviteSummary[];
    projects: WorkspaceInviteProjectOption[];
};

export type AddWorkspaceMemberBody = {
    email?: unknown;
    role?: unknown;
    projectAccesses?: unknown;
};

export type UpdateWorkspaceMemberBody = {
    role?: unknown;
    projectAccessScope?: unknown;
};

export type WorkspaceMemberRouteContext = {
    params: Promise<{
        workspaceId: string;
        memberId: string;
    }>;
};

export type WorkspaceMembersPageProps = {
    params: Promise<{
        workspaceId: string;
    }>;
};

export type WorkspaceInviteAcceptRouteContext = {
    params: Promise<{
        token: string;
    }>;
};

export type CreateWorkspaceHistoryEntryInput = {
    workspaceId: string;
    operation: string;
    message: string;
    data: Prisma.InputJsonValue;
};

export type ListWorkspaceHistoryForUserInput = {
    workspaceId: string;
    userId: string;
    query?: string;
    cursor?: string;
};

export type GetWorkspaceHistoryEntryForUserInput = {
    workspaceId: string;
    historyId: string;
    userId: string;
};

export type ListWorkspaceHistoryForUserResult =
    | {
        status: "NOT_FOUND";
    }
    | {
        status: "FORBIDDEN";
    }
    | {
        status: "INVALID_CURSOR";
    }
    | {
        status: "OK";
        entries: WorkspaceHistoryEntryRecord[];
        hasMore: boolean;
        nextCursor: string | null;
    };

export type WorkspaceHistoryEntryRecord = {
    id: string;
    operation: string;
    message: string;
    createdAt: Date;
};

export type WorkspaceHistoryDetailRecord = WorkspaceHistoryEntryRecord & {
    workspaceId: string;
    data: Prisma.JsonValue;
};

export type DashboardSidebarProps = {
    activeWorkspaceId: string | null;
    projectCount: number;
    memberCount: number;
    historyCount: number;
    workspaceRole: WorkspaceRoleValue | null;
    isOpen: boolean;
    onClose: () => void;
};

export type SidebarItemData = {
    id: string;
    label: string;
    icon: LucideIcon;
    href?: string;
    count?: number;
    active?: boolean;
};

export type DashboardTopNavProps = {
    workspaces: WorkspaceSummary[];
    activeWorkspaceId: string | null;
    activeWorkspaceName: string;
    isCreatingWorkspace: boolean;
    isCreatingProject?: boolean;
    onWorkspaceChange: (workspaceId: string) => void;
    onCreateProject: () => void;
    onCreateWorkspace: () => void;
    onOpenSidebar: () => void;
};
