"use client";

import {
    Crown,
    Clock,
    Loader2,
    Mail,
    MoreHorizontal,
    Send,
    Shield,
    ShieldAlert,
    Trash2,
    User,
    UserMinus,
    Users,
} from "lucide-react";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import UnauthenticatedHome from "@/components/home/UnauthenticatedHome";
import { AvatarPresetBadge } from "@/components/avatar/presets";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticated } from "@/contexts/authenticated";
import { useWorkspace } from "@/contexts/workspace";
import { DEFAULT_AVATAR_PRESET_ID, isAvatarPresetId } from "@/lib/avatar-presets";
import { environmentTypeLabels } from "@/lib/constants";
import type { AvatarPresetId } from "@/types/avatar";
import type {
    ApiErrorPayload,
    EnvironmentTypeValue,
    InviteEnvironmentScopeValue,
    ProjectAccessScopeValue,
    WorkspaceInviteProjectOption,
    WorkspaceInviteSummary,
    WorkspaceMemberSummary,
    WorkspaceMembersPageProps,
    WorkspaceMembersResponse,
    WorkspaceRoleValue,
} from "@/types/workspace";

const ROLE_ICONS: Record<WorkspaceRoleValue, typeof Crown> = {
    OWNER: Crown,
    ADMIN: Shield,
    MEMBER: User,
};

const ROLE_LABELS: Record<WorkspaceRoleValue, string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    MEMBER: "Member",
};

const ROLE_BADGE_VARIANTS: Record<WorkspaceRoleValue, string> = {
    OWNER: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    ADMIN: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
    MEMBER: "border-border bg-muted/40 text-muted-foreground",
};

const ACCESS_SCOPE_LABELS: Record<ProjectAccessScopeValue, string> = {
    ALL_PROJECTS: "All projects",
    SELECTED_PROJECTS: "Selected projects",
};

type InviteProjectDraft = Record<
    string,
    {
        isSelected: boolean;
        environmentScope: InviteEnvironmentScopeValue;
        environments: EnvironmentTypeValue[];
    }
>;

function createInviteProjectDraft(
    projects: WorkspaceInviteProjectOption[]
): InviteProjectDraft {
    return Object.fromEntries(
        projects.map((project) => [
            project.id,
            {
                isSelected: false,
                environmentScope: "ALL_ENVIRONMENTS" as const,
                environments: project.environments,
            },
        ])
    );
}

function getErrorMessage(payload: ApiErrorPayload | null) {
    if (payload?.error && typeof payload.error === "string") {
        return payload.error;
    }
    return "Something went wrong.";
}

function MemberAvatar({ member }: { member: WorkspaceMemberSummary }) {
    const presetId: AvatarPresetId = isAvatarPresetId(member.avatar)
        ? member.avatar
        : DEFAULT_AVATAR_PRESET_ID;

    return (
        <AvatarPresetBadge
            presetId={presetId}
            size="md"
        />
    );
}

function MemberRoleBadge({ role }: { role: WorkspaceRoleValue }) {
    const Icon = ROLE_ICONS[role];

    return (
        <span
            className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[11px] font-medium ${ROLE_BADGE_VARIANTS[role]}`}
        >
            <Icon className="size-3" />
            {ROLE_LABELS[role]}
        </span>
    );
}

function MemberRow({
    member,
    currentUserId,
    currentUserRole,
    onUpdateRole,
    onRemove,
}: {
    member: WorkspaceMemberSummary;
    currentUserId: string;
    currentUserRole: WorkspaceRoleValue | null;
    onUpdateRole: (memberId: string, role: WorkspaceRoleValue) => void;
    onRemove: (memberId: string) => void;
}) {
    const isSelf = member.userId === currentUserId;
    const isOwner = member.role === "OWNER";
    const hasImplicitAllProjectAccess =
        member.role === "OWNER" || member.role === "ADMIN";
    const canManage =
        currentUserRole === "OWNER" ||
        (currentUserRole === "ADMIN" && member.role !== "OWNER");
    const canChangeRole = canManage && !isSelf && !isOwner;
    const canRemove = canManage && !isSelf && !isOwner;

    const displayName =
        member.name ?? member.email ?? `User ${member.userId.slice(0, 8)}`;

    return (
        <div className="flex items-center gap-3 border border-border bg-card px-4 py-3">
            <MemberAvatar member={member} />

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                        {displayName}
                    </p>
                    {isSelf && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                            (you)
                        </span>
                    )}
                </div>
                {member.email && (
                    <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                    </p>
                )}
            </div>

            {!hasImplicitAllProjectAccess && (
                <div className="hidden items-center gap-2 sm:flex">
                    <span className="text-[11px] text-muted-foreground">
                        {ACCESS_SCOPE_LABELS[member.projectAccessScope]}
                    </span>
                </div>
            )}

            <div className="flex items-center gap-2">
                {canChangeRole ? (
                    <Select
                        value={member.role}
                        onValueChange={(value) =>
                            onUpdateRole(member.id, value as WorkspaceRoleValue)
                        }
                    >
                        <SelectTrigger className="h-7 w-[6.5rem] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MEMBER">
                                <span className="flex items-center gap-1.5">
                                    <User className="size-3" />
                                    Member
                                </span>
                            </SelectItem>
                            <SelectItem value="ADMIN">
                                <span className="flex items-center gap-1.5">
                                    <Shield className="size-3" />
                                    Admin
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                ) : (
                    <MemberRoleBadge role={member.role} />
                )}

                {canRemove && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                                Member actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onClick={() => onRemove(member.id)}
                            >
                                <UserMinus className="size-4" />
                                Remove from workspace
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
}

function InviteRow({ invite }: { invite: WorkspaceInviteSummary }) {
    const accessLabel =
        invite.role === "ADMIN"
            ? "All projects"
            : `${invite.projectAccesses.length} project${invite.projectAccesses.length !== 1 ? "s" : ""}`;
    const expiresAt = new Date(invite.expiresAt);

    return (
        <div className="flex items-center gap-3 border border-dashed border-border bg-card px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/30 text-muted-foreground">
                <Mail className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                        {invite.email}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                        pending
                    </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{accessLabel}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {Number.isNaN(expiresAt.getTime())
                            ? "Expires soon"
                            : `Expires ${expiresAt.toLocaleDateString()}`}
                    </span>
                </div>
            </div>

            <MemberRoleBadge role={invite.role} />
        </div>
    );
}

export default function MembersPage({ params }: WorkspaceMembersPageProps) {
    const { workspaceId } = use(params);
    const { isAuthenticated } = useAuthenticated();

    if (!isAuthenticated) {
        return <UnauthenticatedHome />;
    }

    return <AuthenticatedMembersPage workspaceId={workspaceId} />;
}

function AuthenticatedMembersPage({
    workspaceId,
}: {
    workspaceId: string;
}) {
    const { activeWorkspaceId, activeWorkspace, isWorkspaceLoading, selectWorkspace } =
        useWorkspace();
    const { user } = useAuthenticated();

    const [members, setMembers] = useState<WorkspaceMemberSummary[]>([]);
    const [invites, setInvites] = useState<WorkspaceInviteSummary[]>([]);
    const [inviteProjects, setInviteProjects] = useState<
        WorkspaceInviteProjectOption[]
    >([]);
    const [isMembersLoading, setIsMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);

    // Add member dialog
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [addEmailInput, setAddEmailInput] = useState("");
    const [addRoleInput, setAddRoleInput] = useState<WorkspaceRoleValue>("MEMBER");
    const [inviteProjectAccess, setInviteProjectAccess] =
        useState<InviteProjectDraft>({});
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    // Remove member dialog
    const [memberToRemove, setMemberToRemove] =
        useState<WorkspaceMemberSummary | null>(null);
    const [isRemovingMember, setIsRemovingMember] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);

    const workspace =
        activeWorkspaceId === workspaceId &&
            activeWorkspace?.id === workspaceId
            ? activeWorkspace
            : null;

    const currentUserRole = workspace?.role ?? null;
    const currentUserId = user?.id ?? null;
    const canManageMembers =
        currentUserRole === "OWNER" || currentUserRole === "ADMIN";
    const inviteProjectsById = useMemo(
        () => new Map(inviteProjects.map((project) => [project.id, project])),
        [inviteProjects]
    );

    // Sync workspace selection
    useEffect(() => {
        if (workspaceId && workspaceId !== activeWorkspaceId) {
            selectWorkspace(workspaceId);
        }
    }, [workspaceId, activeWorkspaceId, selectWorkspace]);

    // Fetch members
    const fetchMembers = useCallback(async () => {
        setIsMembersLoading(true);
        setMembersError(null);

        try {
            const response = await fetch(`/api/workspaces/${workspaceId}/members`);
            const payload = (await response.json().catch(() => null)) as
                | ApiErrorPayload
                | WorkspaceMembersResponse
                | null;

            if (!response.ok) {
                throw new Error(getErrorMessage(payload as ApiErrorPayload | null));
            }

            const responsePayload = payload as WorkspaceMembersResponse;
            setMembers(responsePayload.members);
            setInvites(responsePayload.invites);
            setInviteProjects(responsePayload.projects);
        } catch (error) {
            setMembersError(
                error instanceof Error
                    ? error.message
                    : "Failed to load members."
            );
        } finally {
            setIsMembersLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        let isActive = true;

        queueMicrotask(() => {
            if (isActive) {
                void fetchMembers();
            }
        });

        return () => {
            isActive = false;
        };
    }, [fetchMembers]);

    const resetInviteForm = useCallback(() => {
        setAddError(null);
        setAddEmailInput("");
        setAddRoleInput("MEMBER");
        setInviteProjectAccess(createInviteProjectDraft(inviteProjects));
    }, [inviteProjects]);

    const toggleInviteProject = useCallback(
        (projectId: string, isSelected: boolean) => {
            const project = inviteProjectsById.get(projectId);

            setInviteProjectAccess((current) => {
                const existing = current[projectId];

                return {
                    ...current,
                    [projectId]: {
                        isSelected,
                        environmentScope:
                            existing?.environmentScope ?? "ALL_ENVIRONMENTS",
                        environments:
                            existing?.environments ??
                            project?.environments ??
                            [],
                    },
                };
            });
        },
        [inviteProjectsById]
    );

    const setInviteProjectEnvironmentScope = useCallback(
        (
            projectId: string,
            environmentScope: InviteEnvironmentScopeValue
        ) => {
            const project = inviteProjectsById.get(projectId);

            setInviteProjectAccess((current) => ({
                ...current,
                [projectId]: {
                    isSelected: current[projectId]?.isSelected ?? true,
                    environmentScope,
                    environments:
                        environmentScope === "ALL_ENVIRONMENTS"
                            ? project?.environments ?? []
                            : current[projectId]?.environments ?? [],
                },
            }));
        },
        [inviteProjectsById]
    );

    const toggleInviteProjectEnvironment = useCallback(
        (
            projectId: string,
            environment: EnvironmentTypeValue,
            isSelected: boolean
        ) => {
            setInviteProjectAccess((current) => {
                const existing = current[projectId] ?? {
                    isSelected: true,
                    environmentScope: "SELECTED_ENVIRONMENTS" as const,
                    environments: [],
                };
                const environments = new Set(existing.environments);

                if (isSelected) {
                    environments.add(environment);
                } else {
                    environments.delete(environment);
                }

                return {
                    ...current,
                    [projectId]: {
                        ...existing,
                        isSelected: true,
                        environmentScope: "SELECTED_ENVIRONMENTS",
                        environments: Array.from(environments),
                    },
                };
            });
        },
        []
    );

    // Add member
    const handleAddMember = useCallback(async () => {
        if (!addEmailInput.trim()) {
            setAddError("Please enter an email address.");
            return;
        }

        const projectAccesses =
            addRoleInput === "MEMBER"
                ? inviteProjects
                    .filter(
                        (project) =>
                            inviteProjectAccess[project.id]?.isSelected
                    )
                    .map((project) => {
                        const access = inviteProjectAccess[project.id];

                        return {
                            projectId: project.id,
                            environmentScope:
                                access?.environmentScope ??
                                "ALL_ENVIRONMENTS",
                            environments:
                                access?.environmentScope ===
                                    "SELECTED_ENVIRONMENTS"
                                    ? access.environments
                                    : project.environments,
                        };
                    })
                : [];

        if (addRoleInput === "MEMBER" && projectAccesses.length === 0) {
            setAddError("Select at least one project for this member.");
            return;
        }

        const missingEnvironmentProject = projectAccesses.find((access) => {
            const project = inviteProjectsById.get(access.projectId);

            return (
                access.environmentScope === "SELECTED_ENVIRONMENTS" &&
                (project?.environments.length ?? 0) > 0 &&
                access.environments.length === 0
            );
        });

        if (missingEnvironmentProject) {
            const project = inviteProjectsById.get(
                missingEnvironmentProject.projectId
            );
            setAddError(
                `Select at least one environment for ${project?.name ?? "the selected project"}.`
            );
            return;
        }

        setIsAddingMember(true);
        setAddError(null);

        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/members`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: addEmailInput.trim(),
                        role: addRoleInput,
                        projectAccesses,
                    }),
                }
            );

            const payload = (await response.json().catch(() => null)) as
                | ApiErrorPayload
                | { invite: WorkspaceInviteSummary }
                | null;

            if (!response.ok) {
                throw new Error(getErrorMessage(payload as ApiErrorPayload | null));
            }

            const newInvite = (payload as { invite: WorkspaceInviteSummary }).invite;
            setInvites((current) => [
                newInvite,
                ...current.filter(
                    (invite) =>
                        invite.id !== newInvite.id &&
                        invite.email !== newInvite.email
                ),
            ]);
            resetInviteForm();
            setIsAddDialogOpen(false);
        } catch (error) {
            setAddError(
                error instanceof Error ? error.message : "Failed to send invite."
            );
        } finally {
            setIsAddingMember(false);
        }
    }, [
        addEmailInput,
        addRoleInput,
        inviteProjectAccess,
        inviteProjects,
        inviteProjectsById,
        resetInviteForm,
        workspaceId,
    ]);

    // Update member role
    const handleUpdateRole = useCallback(
        async (memberId: string, role: WorkspaceRoleValue) => {
            try {
                const response = await fetch(
                    `/api/workspaces/${workspaceId}/members/${memberId}`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ role }),
                    }
                );

                const payload = (await response.json().catch(() => null)) as
                    | ApiErrorPayload
                    | { member: WorkspaceMemberSummary }
                    | null;

                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(payload as ApiErrorPayload | null)
                    );
                }

                const updated = (payload as { member: WorkspaceMemberSummary }).member;
                setMembers((current) =>
                    current.map((m) => (m.id === memberId ? updated : m))
                );
            } catch (error) {
                setMembersError(
                    error instanceof Error
                        ? error.message
                        : "Failed to update member."
                );
            }
        },
        [workspaceId]
    );

    // Remove member
    const handleRemoveMember = useCallback(async () => {
        if (!memberToRemove) return;

        setIsRemovingMember(true);
        setRemoveError(null);

        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/members/${memberToRemove.id}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as
                    | ApiErrorPayload
                    | null;
                throw new Error(getErrorMessage(payload));
            }

            setMembers((current) =>
                current.filter((m) => m.id !== memberToRemove.id)
            );
            setMemberToRemove(null);
        } catch (error) {
            setRemoveError(
                error instanceof Error
                    ? error.message
                    : "Failed to remove member."
            );
        } finally {
            setIsRemovingMember(false);
        }
    }, [memberToRemove, workspaceId]);

    const isLoading = isWorkspaceLoading || isMembersLoading;

    const { ownerMembers, workspaceMembers } = useMemo(() => {
        const roleOrder: Record<WorkspaceRoleValue, number> = {
            OWNER: 0,
            ADMIN: 1,
            MEMBER: 2,
        };
        const sortedMembers = [...members].sort(
            (a, b) => roleOrder[a.role] - roleOrder[b.role]
        );

        return {
            ownerMembers: sortedMembers.filter(
                (member) => member.role === "OWNER"
            ),
            workspaceMembers: sortedMembers.filter(
                (member) => member.role !== "OWNER"
            ),
        };
    }, [members]);
    const sortedInvites = useMemo(
        () =>
            [...invites].sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
            ),
        [invites]
    );

    return (
        <div className="flex flex-1 flex-col">
            {/* Header */}
            <div className="border-b border-border px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="size-5 text-muted-foreground" />
                        <div>
                            <h1 className="text-lg font-semibold text-foreground">
                                Members
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {members.length} member
                                {members.length !== 1 ? "s" : ""} in
                                this workspace
                            </p>
                        </div>
                    </div>
                    {canManageMembers && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                                resetInviteForm();
                                setIsAddDialogOpen(true);
                            }}
                        >
                            <Send className="size-4" />
                            Invite
                        </Button>
                    )}
                </div>
            </div>

            {/* Error */}
            {membersError && (
                <div className="mx-4 mt-4 flex items-center gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-6">
                    <ShieldAlert className="size-4 shrink-0" />
                    {membersError}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 border border-border bg-card px-4 py-3"
                            >
                                <Skeleton className="size-9" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                                <Skeleton className="h-5 w-16" />
                            </div>
                        ))}
                    </div>
                ) : members.length === 0 && sortedInvites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Users className="mb-3 size-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">
                            No members found
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/60">
                            Invite members to collaborate on this workspace.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ownerMembers.length > 0 && (
                            <div className="space-y-1">
                                {ownerMembers.map((member) => (
                                    <MemberRow
                                        key={member.id}
                                        member={member}
                                        currentUserId={currentUserId ?? ""}
                                        currentUserRole={currentUserRole}
                                        onUpdateRole={handleUpdateRole}
                                        onRemove={(memberId) => {
                                            const found = members.find(
                                                (m) => m.id === memberId
                                            );
                                            setMemberToRemove(found ?? null);
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {workspaceMembers.length > 0 && (
                            <div className="space-y-2">
                                {ownerMembers.length > 0 && <Separator />}
                                <p className="text-[11px] font-medium uppercase text-muted-foreground">
                                    Members
                                </p>
                                <div className="space-y-1">
                                    {workspaceMembers.map((member) => (
                                        <MemberRow
                                            key={member.id}
                                            member={member}
                                            currentUserId={currentUserId ?? ""}
                                            currentUserRole={currentUserRole}
                                            onUpdateRole={handleUpdateRole}
                                            onRemove={(memberId) => {
                                                const found = members.find(
                                                    (m) => m.id === memberId
                                                );
                                                setMemberToRemove(found ?? null);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {sortedInvites.length > 0 && (
                            <div className="space-y-2">
                                {(ownerMembers.length > 0 ||
                                    workspaceMembers.length > 0) && (
                                    <Separator />
                                )}
                                <p className="text-[11px] font-medium uppercase text-muted-foreground">
                                    Pending invites
                                </p>
                                <div className="space-y-1">
                                    {sortedInvites.map((invite) => (
                                        <InviteRow
                                            key={invite.id}
                                            invite={invite}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Invite Dialog */}
            <Dialog
                open={isAddDialogOpen}
                onOpenChange={(open) => {
                    setIsAddDialogOpen(open);
                    if (!open) setAddError(null);
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Invite member</DialogTitle>
                        <DialogDescription>
                            Invite someone to this workspace by email address.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label
                                htmlFor="member-email"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Email address
                            </label>
                            <div className="relative">
                                <Mail className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    id="member-email"
                                    type="email"
                                    value={addEmailInput}
                                    onChange={(e) =>
                                        setAddEmailInput(e.target.value)
                                    }
                                    placeholder="colleague@example.com"
                                    className="h-8 w-full border border-border bg-card px-2.5 pl-8 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-ring"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            void handleAddMember();
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Role
                            </label>
                            <Select
                                value={addRoleInput}
                                onValueChange={(value) =>
                                    setAddRoleInput(value as WorkspaceRoleValue)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MEMBER">
                                        <span className="flex items-center gap-1.5">
                                            <User className="size-3" />
                                            Member
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="ADMIN">
                                        <span className="flex items-center gap-1.5">
                                            <Shield className="size-3" />
                                            Admin
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {addRoleInput === "MEMBER" && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        Project access
                                    </label>
                                    <span className="text-[11px] text-muted-foreground">
                                        {inviteProjects.length} project
                                        {inviteProjects.length !== 1 ? "s" : ""}
                                    </span>
                                </div>

                                {inviteProjects.length === 0 ? (
                                    <div className="border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                        No projects available.
                                    </div>
                                ) : (
                                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                        {inviteProjects.map((project) => {
                                            const access =
                                                inviteProjectAccess[project.id];
                                            const isSelected =
                                                access?.isSelected ?? false;
                                            const environmentScope =
                                                access?.environmentScope ??
                                                "ALL_ENVIRONMENTS";
                                            const selectedEnvironments = new Set(
                                                access?.environments ??
                                                    project.environments
                                            );

                                            return (
                                                <div
                                                    key={project.id}
                                                    className="border border-border bg-card"
                                                >
                                                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) =>
                                                                toggleInviteProject(
                                                                    project.id,
                                                                    e.target.checked
                                                                )
                                                            }
                                                            className="size-3.5 accent-primary"
                                                        />
                                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                                            {project.name}
                                                        </span>
                                                    </label>

                                                    {isSelected && (
                                                        <div className="space-y-2 border-t border-border px-3 py-2">
                                                            <Select
                                                                value={
                                                                    environmentScope
                                                                }
                                                                onValueChange={(
                                                                    value
                                                                ) =>
                                                                    setInviteProjectEnvironmentScope(
                                                                        project.id,
                                                                        value as InviteEnvironmentScopeValue
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-7 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="ALL_ENVIRONMENTS">
                                                                        All environments
                                                                    </SelectItem>
                                                                    <SelectItem value="SELECTED_ENVIRONMENTS">
                                                                        Custom environments
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>

                                                            {environmentScope ===
                                                                "SELECTED_ENVIRONMENTS" && (
                                                                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                                                                    {project.environments.length ===
                                                                    0 ? (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            No environments
                                                                        </span>
                                                                    ) : (
                                                                        project.environments.map(
                                                                            (
                                                                                environment
                                                                            ) => (
                                                                                <label
                                                                                    key={
                                                                                        environment
                                                                                    }
                                                                                    className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedEnvironments.has(
                                                                                            environment
                                                                                        )}
                                                                                        onChange={(
                                                                                            e
                                                                                        ) =>
                                                                                            toggleInviteProjectEnvironment(
                                                                                                project.id,
                                                                                                environment,
                                                                                                e
                                                                                                    .target
                                                                                                    .checked
                                                                                            )
                                                                                        }
                                                                                        className="size-3 accent-primary"
                                                                                    />
                                                                                    <span className="truncate">
                                                                                        {
                                                                                            environmentTypeLabels[
                                                                                                environment
                                                                                            ]
                                                                                        }
                                                                                    </span>
                                                                                </label>
                                                                            )
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {addError && (
                            <div className="flex items-center gap-2 text-xs text-destructive">
                                <ShieldAlert className="size-3.5 shrink-0" />
                                {addError}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddDialogOpen(false)}
                            disabled={isAddingMember}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleAddMember()}
                            disabled={isAddingMember}
                        >
                            {isAddingMember ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            Send invite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Member Dialog */}
            <Dialog
                open={memberToRemove !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setMemberToRemove(null);
                        setRemoveError(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove member</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove{" "}
                            <span className="font-medium text-foreground">
                                {memberToRemove?.name ??
                                    memberToRemove?.email ??
                                    "this member"}
                            </span>{" "}
                            from this workspace? They will lose access to all
                            projects and environment variables.
                        </DialogDescription>
                    </DialogHeader>

                    {removeError && (
                        <div className="flex items-center gap-2 text-xs text-destructive">
                            <ShieldAlert className="size-3.5 shrink-0" />
                            {removeError}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setMemberToRemove(null)}
                            disabled={isRemovingMember}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleRemoveMember()}
                            disabled={isRemovingMember}
                        >
                            {isRemovingMember ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Trash2 className="size-4" />
                            )}
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
