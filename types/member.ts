import type { ProjectRoleValue } from "@/types/project";
import type {
    EnvironmentAccessScopeValue,
    EnvironmentTypeValue,
    ProjectAccessScopeValue,
    WorkspaceRoleValue,
} from "@/types/workspace";

export type WorkspaceInviteStatusValue = "PENDING" | "ACCEPTED" | "REVOKED";

export type MemberFormDraft = {
    email: string;
    role: WorkspaceRoleValue;
    projectAccessScope: ProjectAccessScopeValue;
    defaultProjectRole: ProjectRoleValue;
    projects: MemberProjectAccessInput[];
};

export type DialogState =
    | { type: "invite"; member: null }
    | { type: "edit"; member: WorkspaceMember };

export type MembersTab = "members" | "invites";

export type RoleFilterValue = "ALL" | WorkspaceRoleValue;

export type AccessFilterValue = "ALL" | "FULL_ACCESS" | ProjectAccessScopeValue;

export type MemberActionFilterValue = "ALL" | "CAN_EDIT" | "CAN_REMOVE";

export type InviteDeliveryFilterValue = "ALL" | "SENT" | "NOT_SENT";

export type InviteExpiryFilterValue =
    | "ALL"
    | "ACTIVE"
    | "EXPIRING_SOON"
    | "EXPIRED";

export type InviteStatusFilterValue = "ALL" | WorkspaceInviteStatusValue;

export type InviteActionFilterValue = "ALL" | "CAN_REVOKE";

export type MemberSortValue =
    | "name-asc"
    | "email-asc"
    | "role-asc"
    | "newest"
    | "oldest"
    | "updated-desc"
    | "projects-desc";

export type InviteSortValue =
    | "email-asc"
    | "newest"
    | "oldest"
    | "expires-soon"
    | "expires-latest"
    | "role-asc"
    | "status-asc"
    | "projects-desc";

export type PaginationState<T> = {
    currentPage: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    rows: T[];
};

export type FilterOption<TValue extends string> = {
    value: TValue;
    label: string;
};

export type AppliedFilterChip = {
    id: string;
    label: string;
    onRemove: () => void;
};

export type MemberProjectAccessInput = {
    projectId: string;
    role: ProjectRoleValue;
    environmentAccessScope: EnvironmentAccessScopeValue;
    environments: EnvironmentTypeValue[];
};

export type MemberAccessInput = {
    role: WorkspaceRoleValue;
    projectAccessScope: ProjectAccessScopeValue;
    defaultProjectRole: ProjectRoleValue;
    defaultEnvironmentAccessScope: EnvironmentAccessScopeValue;
    projects: MemberProjectAccessInput[];
};

export type WorkspaceMemberProjectAccessRecord = {
    projectId: string;
    projectName: string;
    role: ProjectRoleValue;
    environmentAccessScope: EnvironmentAccessScopeValue;
    environments: EnvironmentTypeValue[];
};

export type WorkspaceMemberRecord = {
    id: string;
    userId: string;
    email: string;
    name: string | null;
    role: WorkspaceRoleValue;
    projectAccessScope: ProjectAccessScopeValue;
    defaultProjectRole: ProjectRoleValue;
    defaultEnvironmentAccessScope: EnvironmentAccessScopeValue;
    addedByEmail: string | null;
    createdAt: Date;
    updatedAt: Date;
    projects: WorkspaceMemberProjectAccessRecord[];
    canEdit: boolean;
    canRemove: boolean;
};

export type WorkspaceInviteRecord = {
    id: string;
    email: string;
    role: WorkspaceRoleValue;
    projectAccessScope: ProjectAccessScopeValue;
    defaultProjectRole: ProjectRoleValue;
    defaultEnvironmentAccessScope: EnvironmentAccessScopeValue;
    status: WorkspaceInviteStatusValue;
    invitedByEmail: string | null;
    acceptedByEmail: string | null;
    revokedByEmail: string | null;
    emailSentAt: Date | null;
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    projects: WorkspaceMemberProjectAccessRecord[];
    canRevoke: boolean;
};

export type WorkspaceMemberProjectOption = {
    id: string;
    name: string;
    environments: EnvironmentTypeValue[];
};

export type WorkspaceMembersRecord = {
    workspaceId: string;
    workspaceName: string;
    actorMemberId: string;
    actorRole: WorkspaceRoleValue;
    canManage: boolean;
    members: WorkspaceMemberRecord[];
    invites: WorkspaceInviteRecord[];
    projects: WorkspaceMemberProjectOption[];
};

export type WorkspaceMemberProjectAccess = WorkspaceMemberProjectAccessRecord;

export type WorkspaceMember = Omit<
    WorkspaceMemberRecord,
    "createdAt" | "updatedAt"
> & {
    createdAt: string;
    updatedAt: string;
};

export type WorkspaceInvite = Omit<
    WorkspaceInviteRecord,
    | "acceptedAt"
    | "createdAt"
    | "emailSentAt"
    | "expiresAt"
    | "revokedAt"
    | "updatedAt"
> & {
    acceptedAt: string | null;
    createdAt: string;
    emailSentAt: string | null;
    expiresAt: string;
    revokedAt: string | null;
    updatedAt: string;
};

export type WorkspaceMembersResponse = Omit<
    WorkspaceMembersRecord,
    "members" | "invites"
> & {
    members: WorkspaceMember[];
    invites: WorkspaceInvite[];
};

export type InviteWorkspaceMemberRequest = MemberAccessInput & {
    email: string;
};

export type UpdateWorkspaceMemberRequest = MemberAccessInput;

export type InviteWorkspaceMemberBody = {
    email?: unknown;
    role?: unknown;
    projectAccessScope?: unknown;
    defaultProjectRole?: unknown;
    defaultEnvironmentAccessScope?: unknown;
    projects?: unknown;
};

export type UpdateWorkspaceMemberBody = Omit<
    InviteWorkspaceMemberBody,
    "email"
>;

export type InviteWorkspaceMemberResponse = {
    invite: WorkspaceInvite;
    emailStatus: "SENT" | "NOT_CONFIGURED" | "FAILED";
};

export type UpdateWorkspaceMemberResponse = {
    member: WorkspaceMember;
};

export type AcceptWorkspaceInviteResponse = {
    workspaceId: string;
    workspaceName: string;
};

export type WorkspaceMemberRouteContext = {
    params: Promise<{
        workspaceId: string;
        memberId: string;
    }>;
};

export type WorkspaceInviteRouteContext = {
    params: Promise<{
        workspaceId: string;
        inviteId: string;
    }>;
};

export type WorkspaceInviteAcceptRouteContext = {
    params: Promise<{
        token: string;
    }>;
};

export type WorkspaceInvitePageProps = {
    params: Promise<{
        token: string;
    }>;
};
