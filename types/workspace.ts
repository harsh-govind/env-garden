import type { LucideIcon } from "lucide-react";
import type { Prisma } from "@/prisma/generated/client";

export type WorkspaceRoleValue = "OWNER" | "ADMIN" | "MEMBER";

export type ProjectAccessScopeValue = "ALL_PROJECTS" | "SELECTED_PROJECTS";

export type WorkspaceProjectSummary = {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    updatedAt: string;
};

export type WorkspaceHistoryEntry = {
    id: string;
    operation: string;
    message: string;
    data: Record<string, unknown>;
    createdAt: string;
};

export type WorkspaceSummary = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    role: WorkspaceRoleValue;
    projectAccessScope: ProjectAccessScopeValue;
    projectCount: number;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
};

export type WorkspaceDetail = WorkspaceSummary & {
    projects: WorkspaceProjectSummary[];
    history: WorkspaceHistoryEntry[];
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
    workspace: WorkspaceSummary;
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

export type WorkspaceSummaryRecord = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    role: WorkspaceRoleValue;
    projectAccessScope: ProjectAccessScopeValue;
    projectCount: number;
    memberCount: number;
    createdAt: Date;
    updatedAt: Date;
};

export type WorkspaceDetailRecord = WorkspaceSummaryRecord & {
    projects: {
        id: string;
        name: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
    }[];
    history: {
        id: string;
        operation: string;
        message: string;
        data: unknown;
        createdAt: Date;
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

export type DashboardSidebarProps = {
    workspaceName: string;
    projectCount: number;
    memberCount: number;
    historyCount: number;
    isOpen: boolean;
    onClose: () => void;
};

export type SidebarItemData = {
    id: string;
    label: string;
    icon: LucideIcon;
    count?: number;
    active?: boolean;
};

export type DashboardTopNavProps = {
    workspaces: WorkspaceSummary[];
    activeWorkspaceId: string | null;
    activeWorkspaceName: string;
    workspaceInitial: string;
    isCreatingWorkspace: boolean;
    onWorkspaceChange: (workspaceId: string) => void;
    onCreateWorkspace: () => void;
    onOpenSidebar: () => void;
};
