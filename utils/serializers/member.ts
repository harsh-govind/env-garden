import type {
    WorkspaceInvite,
    WorkspaceInviteRecord,
    WorkspaceMember,
    WorkspaceMemberRecord,
    WorkspaceMembersRecord,
    WorkspaceMembersResponse,
} from "@/types/member";

export function serializeWorkspaceMember(
    record: WorkspaceMemberRecord
): WorkspaceMember {
    return {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export function serializeWorkspaceInvite(
    record: WorkspaceInviteRecord
): WorkspaceInvite {
    return {
        ...record,
        acceptedAt: record.acceptedAt?.toISOString() ?? null,
        emailSentAt: record.emailSentAt?.toISOString() ?? null,
        expiresAt: record.expiresAt.toISOString(),
        revokedAt: record.revokedAt?.toISOString() ?? null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export function serializeWorkspaceMembers(
    record: WorkspaceMembersRecord
): WorkspaceMembersResponse {
    return {
        ...record,
        members: record.members.map(serializeWorkspaceMember),
        invites: record.invites.map(serializeWorkspaceInvite),
    };
}
