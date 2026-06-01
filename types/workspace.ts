import type { LucideIcon } from "lucide-react";
import type { Prisma } from "@/prisma/generated/client";

export type WorkspaceRoleValue = "OWNER" | "ADMIN" | "MEMBER";

export type ProjectAccessScopeValue = "ALL_PROJECTS" | "SELECTED_PROJECTS";

export type WorkspaceProjectSummary = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
};

export type WorkspaceHistoryEntry = {
    id: string;
    operation: string;
    message: string;
    createdAt: string;
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

export type WorkspaceHistoryResponse = {
    history: WorkspaceHistoryEntry[];
};

export type WorkspaceContextValue = {
    workspaces: WorkspaceSummary[];
    activeWorkspaceId: string | null;
    activeWorkspace: WorkspaceDetail | null;
    isLoading: boolean;
    isWorkspaceLoading: boolean;
    isCreatingWorkspace: boolean;
    error: string | null;
    selectWorkspace: (workspaceId: string) => void;
    refreshWorkspaces: () => Promise<void>;
    createWorkspace: (input: CreateWorkspaceRequest) => Promise<void>;
};

export type ApiErrorPayload = {
    error?: string;
};

export type CreateWorkspaceBody = {
    name?: unknown;
    description?: unknown;
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
    projects: {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
    }[];
};

export type CreateWorkspaceForUserInput = {
    userId: string;
    name: string;
    description?: string | null;
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
};

export type ListWorkspaceHistoryForUserResult =
    | {
        status: "NOT_FOUND";
    }
    | {
        status: "FORBIDDEN";
    }
    | {
        status: "OK";
        entries: WorkspaceHistoryEntryRecord[];
    };

export type WorkspaceHistoryEntryRecord = {
    id: string;
    operation: string;
    message: string;
    createdAt: Date;
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
    onWorkspaceChange: (workspaceId: string) => void;
    onCreateProject: () => void;
    onCreateWorkspace: () => void;
    onOpenSidebar: () => void;
};
