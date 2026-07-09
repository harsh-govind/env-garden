"use client";

import {
    SlidersHorizontal,
    Mail,
    Pencil,
    Search,
    Shield,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import {
    use,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";
import UnauthenticatedHome from "@/components/home/UnauthenticatedHome";
import { Badge } from "@/components/ui/badge";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthenticated } from "@/contexts/authenticated";
import { useWorkspace } from "@/contexts/workspace";
import { environmentTypeLabels } from "@/constants/environment";
import { createInMemoryCache } from "@/lib/cache";
import { cn, formatTimeAgo } from "@/lib/utils";
import type {
    AccessFilterValue,
    AppliedFilterChip,
    DialogState,
    FilterOption,
    InviteActionFilterValue,
    InviteDeliveryFilterValue,
    InviteEmailStatus,
    InviteExpiryFilterValue,
    InviteSortValue,
    InviteStatusFilterValue,
    InviteWorkspaceMemberBody,
    InviteWorkspaceMemberResponse,
    MemberActionFilterValue,
    MemberFormDraft,
    MemberProjectAccessInput,
    MemberSortValue,
    MembersTab,
    PaginationState,
    RoleFilterValue,
    UpdateWorkspaceMemberResponse,
    WorkspaceInvite,
    WorkspaceInviteStatusValue,
    WorkspaceMember,
    WorkspaceMemberProjectOption,
    WorkspaceMembersResponse,
} from "@/types/member";
import type {
    ApiErrorPayload,
    EnvironmentAccessScopeValue,
    ProjectAccessScopeValue,
    WorkspaceMembersPageProps,
    WorkspaceRoleValue,
} from "@/types/workspace";
import type { ProjectRoleValue } from "@/types/project";

const workspaceRoleLabels: Record<WorkspaceRoleValue, string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    MEMBER: "Member",
};
const projectRoleLabels: Record<ProjectRoleValue, string> = {
    OWNER: "Owner",
    CONTRIBUTOR: "Contributor",
    VIEWER: "Viewer",
};
const environmentAccessLabels: Record<EnvironmentAccessScopeValue, string> = {
    ALL_ENVIRONMENTS: "All environments",
    SELECTED_ENVIRONMENTS: "Selected environments",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const membersCache = createInMemoryCache<WorkspaceMembersResponse>(5 * 60 * 1000);

const workspaceRoleRank: Record<WorkspaceRoleValue, number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
};
const inviteStatusRank: Record<WorkspaceInviteStatusValue, number> = {
    PENDING: 0,
    ACCEPTED: 1,
    REVOKED: 2,
};

const roleFilterLabels: Record<Exclude<RoleFilterValue, "ALL">, string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    MEMBER: "Member",
};
const accessFilterLabels: Record<Exclude<AccessFilterValue, "ALL">, string> = {
    FULL_ACCESS: "Full access",
    ALL_PROJECTS: "All projects",
    SELECTED_PROJECTS: "Selected projects",
};
const memberActionFilterLabels: Record<
    Exclude<MemberActionFilterValue, "ALL">,
    string
> = {
    CAN_EDIT: "Editable",
    CAN_REMOVE: "Removable",
};
const inviteDeliveryFilterLabels: Record<
    Exclude<InviteDeliveryFilterValue, "ALL">,
    string
> = {
    SENT: "Email sent",
    NOT_SENT: "Email not sent",
};
const inviteExpiryFilterLabels: Record<
    Exclude<InviteExpiryFilterValue, "ALL">,
    string
> = {
    ACTIVE: "Active",
    EXPIRING_SOON: "Expiring soon",
    EXPIRED: "Expired",
};
const inviteStatusFilterLabels: Record<
    Exclude<InviteStatusFilterValue, "ALL">,
    string
> = {
    PENDING: "Pending",
    ACCEPTED: "Accepted",
    REVOKED: "Revoked",
};
const inviteActionFilterLabels: Record<
    Exclude<InviteActionFilterValue, "ALL">,
    string
> = {
    CAN_REVOKE: "Revocable",
};
const memberSortLabels: Record<MemberSortValue, string> = {
    "name-asc": "Name A-Z",
    "email-asc": "Email A-Z",
    "role-asc": "Role",
    newest: "Newest",
    oldest: "Oldest",
    "updated-desc": "Recently updated",
    "projects-desc": "Most projects",
};
const inviteSortLabels: Record<InviteSortValue, string> = {
    "email-asc": "Email A-Z",
    newest: "Newest",
    oldest: "Oldest",
    "expires-soon": "Expires soon",
    "expires-latest": "Expires latest",
    "role-asc": "Role",
    "status-asc": "Status",
    "projects-desc": "Most projects",
};
const memberRoleFilterOptions: FilterOption<RoleFilterValue>[] = [
    { value: "ALL", label: "All roles" },
    { value: "OWNER", label: "Owner" },
    { value: "ADMIN", label: "Admin" },
    { value: "MEMBER", label: "Member" },
];
const inviteRoleFilterOptions: FilterOption<RoleFilterValue>[] = [
    { value: "ALL", label: "All roles" },
    { value: "ADMIN", label: "Admin" },
    { value: "MEMBER", label: "Member" },
];
const accessFilterOptions: FilterOption<AccessFilterValue>[] = [
    { value: "ALL", label: "All access" },
    { value: "FULL_ACCESS", label: "Full access" },
    { value: "ALL_PROJECTS", label: "All projects" },
    { value: "SELECTED_PROJECTS", label: "Selected projects" },
];
const memberActionFilterOptions: FilterOption<MemberActionFilterValue>[] = [
    { value: "ALL", label: "All members" },
    { value: "CAN_EDIT", label: "Editable" },
    { value: "CAN_REMOVE", label: "Removable" },
];
const inviteDeliveryFilterOptions: FilterOption<InviteDeliveryFilterValue>[] = [
    { value: "ALL", label: "Any delivery" },
    { value: "SENT", label: "Email sent" },
    { value: "NOT_SENT", label: "Email not sent" },
];
const inviteExpiryFilterOptions: FilterOption<InviteExpiryFilterValue>[] = [
    { value: "ALL", label: "Any expiry" },
    { value: "ACTIVE", label: "Active" },
    { value: "EXPIRING_SOON", label: "Expiring soon" },
    { value: "EXPIRED", label: "Expired" },
];
const inviteStatusFilterOptions: FilterOption<InviteStatusFilterValue>[] = [
    { value: "ALL", label: "Any status" },
    { value: "PENDING", label: "Pending" },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "REVOKED", label: "Revoked" },
];
const inviteActionFilterOptions: FilterOption<InviteActionFilterValue>[] = [
    { value: "ALL", label: "All invites" },
    { value: "CAN_REVOKE", label: "Revocable" },
];
const memberSortOptions: FilterOption<MemberSortValue>[] = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "email-asc", label: "Email A-Z" },
    { value: "role-asc", label: "Role" },
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "updated-desc", label: "Recently updated" },
    { value: "projects-desc", label: "Most projects" },
];
const inviteSortOptions: FilterOption<InviteSortValue>[] = [
    { value: "email-asc", label: "Email A-Z" },
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "expires-soon", label: "Expires soon" },
    { value: "expires-latest", label: "Expires latest" },
    { value: "role-asc", label: "Role" },
    { value: "status-asc", label: "Status" },
    { value: "projects-desc", label: "Most projects" },
];

function getErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
    return payload?.error && typeof payload.error === "string"
        ? payload.error
        : fallback;
}

function getInviteNotice(emailStatus: InviteEmailStatus) {
    if (emailStatus === "SENT") {
        return "Invite sent.";
    }

    if (emailStatus === "NOT_CONFIGURED") {
        return "Invite created. Email delivery is not configured.";
    }

    return "Invite created, but email delivery failed.";
}

function useDebouncedValue<T>(value: T, delayMs: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delayMs);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [delayMs, value]);

    return debouncedValue;
}

function normalizeSearch(value: string) {
    return value.trim().toLowerCase();
}

function compareText(left: string, right: string) {
    return left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

function getProjectSearchText(
    projects: WorkspaceMember["projects"] | WorkspaceInvite["projects"]
) {
    return projects
        .flatMap((project) => [
            project.projectName,
            project.role,
            project.environmentAccessScope,
            ...project.environments.map((environment) => environmentTypeLabels[environment]),
        ])
        .join(" ");
}

function getMemberSearchText(member: WorkspaceMember) {
    return [
        member.name ?? "",
        member.email,
        workspaceRoleLabels[member.role],
        member.role,
        formatAccessSummary(member),
        member.addedByEmail ?? "",
        getProjectSearchText(member.projects),
    ].join(" ");
}

function getInviteSearchText(invite: WorkspaceInvite) {
    return [
        invite.email,
        workspaceRoleLabels[invite.role],
        invite.role,
        invite.status,
        inviteStatusFilterLabels[invite.status],
        formatAccessSummary(invite),
        invite.invitedByEmail ?? "",
        invite.acceptedByEmail ?? "",
        invite.revokedByEmail ?? "",
        invite.emailSentAt ? "email sent" : "email not sent",
        getProjectSearchText(invite.projects),
    ].join(" ");
}

function getAccessFilterValue(member: WorkspaceMember | WorkspaceInvite): AccessFilterValue {
    if (member.role === "OWNER" || member.role === "ADMIN") {
        return "FULL_ACCESS";
    }

    return member.projectAccessScope;
}

function matchesRoleFilter(
    role: WorkspaceRoleValue,
    filter: RoleFilterValue
) {
    return filter === "ALL" || role === filter;
}

function matchesAccessFilter(
    member: WorkspaceMember | WorkspaceInvite,
    filter: AccessFilterValue
) {
    return filter === "ALL" || getAccessFilterValue(member) === filter;
}

function paginateRows<T>(
    rows: T[],
    page: number,
    pageSize: number
): PaginationState<T> {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (currentPage - 1) * pageSize;

    return {
        currentPage,
        totalPages,
        startIndex,
        endIndex: Math.min(startIndex + pageSize, rows.length),
        rows: rows.slice(startIndex, startIndex + pageSize),
    };
}

function sortMembers(rows: WorkspaceMember[], sort: MemberSortValue) {
    return [...rows].sort((left, right) => {
        if (sort === "email-asc") {
            return compareText(left.email, right.email);
        }

        if (sort === "role-asc") {
            return workspaceRoleRank[left.role] - workspaceRoleRank[right.role]
                || compareText(left.email, right.email);
        }

        if (sort === "newest") {
            return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }

        if (sort === "oldest") {
            return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        }

        if (sort === "updated-desc") {
            return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }

        if (sort === "projects-desc") {
            return right.projects.length - left.projects.length
                || compareText(left.email, right.email);
        }

        return compareText(left.name ?? left.email, right.name ?? right.email)
            || compareText(left.email, right.email);
    });
}

function sortInvites(rows: WorkspaceInvite[], sort: InviteSortValue) {
    return [...rows].sort((left, right) => {
        if (sort === "newest") {
            return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }

        if (sort === "oldest") {
            return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        }

        if (sort === "expires-soon") {
            return new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime();
        }

        if (sort === "expires-latest") {
            return new Date(right.expiresAt).getTime() - new Date(left.expiresAt).getTime();
        }

        if (sort === "role-asc") {
            return workspaceRoleRank[left.role] - workspaceRoleRank[right.role]
                || compareText(left.email, right.email);
        }

        if (sort === "status-asc") {
            return inviteStatusRank[left.status] - inviteStatusRank[right.status]
                || compareText(left.email, right.email);
        }

        if (sort === "projects-desc") {
            return right.projects.length - left.projects.length
                || compareText(left.email, right.email);
        }

        return compareText(left.email, right.email);
    });
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetch(input, init);
    const payload = (await response.json().catch(() => null)) as
        | ApiErrorPayload
        | T
        | null;

    if (!response.ok) {
        throw new Error(getErrorMessage(payload as ApiErrorPayload | null, "Request failed."));
    }

    if (!payload) {
        throw new Error("Received an empty response from the server.");
    }

    return payload as T;
}

function createInviteDraft(): MemberFormDraft {
    return {
        email: "",
        role: "MEMBER",
        projectAccessScope: "SELECTED_PROJECTS",
        defaultProjectRole: "VIEWER",
        projects: [],
    };
}

function createEditDraft(member: WorkspaceMember): MemberFormDraft {
    return {
        email: member.email,
        role: member.role,
        projectAccessScope: member.projectAccessScope,
        defaultProjectRole: member.defaultProjectRole,
        projects: member.projects.map((project) => ({
            projectId: project.projectId,
            role: project.role,
            environmentAccessScope: project.environmentAccessScope,
            environments: project.environments,
        })),
    };
}

function buildAccessBody(draft: MemberFormDraft): InviteWorkspaceMemberBody {
    const forcedProjectRole = draft.role === "ADMIN" ? "CONTRIBUTOR" : null;

    if (forcedProjectRole) {
        return {
            email: draft.email,
            role: draft.role,
            projectAccessScope: "ALL_PROJECTS",
            defaultProjectRole: forcedProjectRole,
            defaultEnvironmentAccessScope: "ALL_ENVIRONMENTS",
            projects: [],
        };
    }

    return {
        email: draft.email,
        role: draft.role,
        projectAccessScope: draft.projectAccessScope,
        defaultProjectRole:
            draft.projectAccessScope === "ALL_PROJECTS"
                ? draft.defaultProjectRole
                : "VIEWER",
        defaultEnvironmentAccessScope: "ALL_ENVIRONMENTS",
        projects:
            draft.projectAccessScope === "SELECTED_PROJECTS"
                ? draft.projects
                : [],
    };
}

function formatAccessSummary(member: WorkspaceMember | WorkspaceInvite) {
    if (member.role === "OWNER" || member.role === "ADMIN") {
        return "All projects and environments";
    }

    if (member.projectAccessScope === "ALL_PROJECTS") {
        return `${projectRoleLabels[member.defaultProjectRole]} on all projects`;
    }

    return `${member.projects.length} selected project${member.projects.length === 1 ? "" : "s"}`;
}

export default function MembersPage({ params }: WorkspaceMembersPageProps) {
    const { workspaceId } = use(params);
    const { isAuthenticated } = useAuthenticated();

    if (!isAuthenticated) {
        return <UnauthenticatedHome />;
    }

    return <AuthenticatedMembersPage workspaceId={workspaceId} />;
}

function AuthenticatedMembersPage({ workspaceId }: { workspaceId: string }) {
    const {
        activeWorkspaceId,
        activeWorkspace,
        selectWorkspace,
        refreshWorkspaces,
    } = useWorkspace();
    const [data, setData] = useState<WorkspaceMembersResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogState, setDialogState] = useState<DialogState | null>(null);
    const [draft, setDraft] = useState<MemberFormDraft>(createInviteDraft);
    const [formError, setFormError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<MembersTab>("members");
    const [memberSearch, setMemberSearch] = useState("");
    const [memberRoleFilter, setMemberRoleFilter] = useState<RoleFilterValue>("ALL");
    const [memberAccessFilter, setMemberAccessFilter] = useState<AccessFilterValue>("ALL");
    const [memberActionFilter, setMemberActionFilter] = useState<MemberActionFilterValue>("ALL");
    const [memberSort, setMemberSort] = useState<MemberSortValue>("name-asc");
    const [memberPage, setMemberPage] = useState(1);
    const [memberPageSize, setMemberPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
    const [inviteSearch, setInviteSearch] = useState("");
    const [inviteRoleFilter, setInviteRoleFilter] = useState<RoleFilterValue>("ALL");
    const [inviteAccessFilter, setInviteAccessFilter] = useState<AccessFilterValue>("ALL");
    const [inviteDeliveryFilter, setInviteDeliveryFilter] =
        useState<InviteDeliveryFilterValue>("ALL");
    const [inviteExpiryFilter, setInviteExpiryFilter] =
        useState<InviteExpiryFilterValue>("ALL");
    const [inviteStatusFilter, setInviteStatusFilter] =
        useState<InviteStatusFilterValue>("ALL");
    const [inviteActionFilter, setInviteActionFilter] =
        useState<InviteActionFilterValue>("ALL");
    const [inviteSort, setInviteSort] = useState<InviteSortValue>("newest");
    const [invitePage, setInvitePage] = useState(1);
    const [invitePageSize, setInvitePageSize] = useState(PAGE_SIZE_OPTIONS[0]);
    const [filterNow] = useState(() => Date.now());
    const debouncedMemberSearch = useDebouncedValue(memberSearch, 300);
    const debouncedInviteSearch = useDebouncedValue(inviteSearch, 300);
    const dataRef = useRef<WorkspaceMembersResponse | null>(null);

    const workspace =
        activeWorkspaceId === workspaceId && activeWorkspace?.id === workspaceId
            ? activeWorkspace
            : null;
    const commitMembersData = useCallback(
        (nextData: WorkspaceMembersResponse | null) => {
            dataRef.current = nextData;
            setData(nextData);

            if (nextData) {
                membersCache.set(workspaceId, nextData);
            } else {
                membersCache.delete(workspaceId);
            }
        },
        [workspaceId]
    );
    const updateMembersData = useCallback(
        (
            updater: (
                currentData: WorkspaceMembersResponse
            ) => WorkspaceMembersResponse
        ) => {
            const currentData = dataRef.current;

            if (!currentData) {
                return;
            }

            commitMembersData(updater(currentData));
        },
        [commitMembersData]
    );
    const loadMembers = useCallback(
        async (
            signal?: AbortSignal,
            options: { force?: boolean; keepCurrentData?: boolean } = {}
        ) => {
            const cached = options.force ? undefined : membersCache.get(workspaceId);

            if (cached) {
                commitMembersData(cached);
                setError(null);
                setIsLoading(false);
                return;
            }

            if (!options.keepCurrentData) {
                setIsLoading(true);
                commitMembersData(null);
            }

            try {
                const response = await fetchJson<WorkspaceMembersResponse>(
                    `/api/workspaces/${workspaceId}/members`,
                    { signal }
                );
                commitMembersData(response);
                setError(null);
            } catch (loadError) {
                if (signal?.aborted) {
                    return;
                }

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "Failed to load workspace members."
                );

                if (!options.keepCurrentData) {
                    commitMembersData(null);
                }
            } finally {
                if (!signal?.aborted) {
                    setIsLoading(false);
                }
            }
        },
        [commitMembersData, workspaceId]
    );

    useEffect(() => {
        if (workspaceId !== activeWorkspaceId) {
            selectWorkspace(workspaceId);
        }
    }, [workspaceId, activeWorkspaceId, selectWorkspace]);

    useEffect(() => {
        const controller = new AbortController();
        queueMicrotask(() => {
            if (!controller.signal.aborted) {
                void loadMembers(controller.signal);
            }
        });

        return () => {
            controller.abort();
        };
    }, [loadMembers]);

    const openInviteDialog = () => {
        setDialogState({ type: "invite", member: null });
        setDraft(createInviteDraft());
        setFormError(null);
        setNotice(null);
    };

    const openEditDialog = (member: WorkspaceMember) => {
        setDialogState({ type: "edit", member });
        setDraft(createEditDraft(member));
        setFormError(null);
        setNotice(null);
    };

    const closeDialog = () => {
        setDialogState(null);
        setFormError(null);
    };

    const upsertProjectDraft = (
        projectId: string,
        update: Partial<MemberProjectAccessInput> | null
    ) => {
        setDraft((current) => {
            const existing = current.projects.find(
                (project) => project.projectId === projectId
            );

            if (!update) {
                return {
                    ...current,
                    projects: current.projects.filter(
                        (project) => project.projectId !== projectId
                    ),
                };
            }

            const nextProject: MemberProjectAccessInput = {
                projectId,
                role: existing?.role ?? "VIEWER",
                environmentAccessScope:
                    existing?.environmentAccessScope ?? "ALL_ENVIRONMENTS",
                environments: existing?.environments ?? [],
                ...update,
            };

            return {
                ...current,
                projects: existing
                    ? current.projects.map((project) =>
                        project.projectId === projectId ? nextProject : project
                    )
                    : [...current.projects, nextProject],
            };
        });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!dialogState) {
            return;
        }

        const body = buildAccessBody(draft);

        if (dialogState.type === "invite" && draft.email.trim().length === 0) {
            setFormError("Email is required.");
            return;
        }

        if (
            draft.role === "MEMBER" &&
            draft.projectAccessScope === "SELECTED_PROJECTS" &&
            draft.projects.length === 0
        ) {
            setFormError("Select at least one project.");
            return;
        }

        if (
            draft.role === "MEMBER" &&
            draft.projectAccessScope === "SELECTED_PROJECTS" &&
            draft.projects.some(
                (project) =>
                    project.environmentAccessScope === "SELECTED_ENVIRONMENTS" &&
                    project.environments.length === 0
            )
        ) {
            setFormError("Select at least one environment for each selected project.");
            return;
        }

        setIsSubmitting(true);
        setFormError(null);

        try {
            if (dialogState.type === "invite") {
                const response = await fetchJson<InviteWorkspaceMemberResponse>(
                    `/api/workspaces/${workspaceId}/members`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(body),
                    }
                );

                updateMembersData((current) => ({
                    ...current,
                    invites: [response.invite, ...current.invites],
                }));
                setNotice(getInviteNotice(response.emailStatus));
            } else {
                const response = await fetchJson<UpdateWorkspaceMemberResponse>(
                    `/api/workspaces/${workspaceId}/members/${dialogState.member.id}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(body),
                    }
                );

                updateMembersData((current) => ({
                    ...current,
                    members: current.members.map((member) =>
                        member.id === response.member.id
                            ? response.member
                            : member
                    ),
                }));
                setNotice("Member access updated.");
                await refreshWorkspaces();
            }

            closeDialog();
        } catch (submitError) {
            setFormError(
                submitError instanceof Error
                    ? submitError.message
                    : "Failed to save member access."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeMember = async (member: WorkspaceMember) => {
        if (!window.confirm(`Remove ${member.email} from this workspace?`)) {
            return;
        }

        try {
            await fetchJson<{ ok: boolean }>(
                `/api/workspaces/${workspaceId}/members/${member.id}`,
                { method: "DELETE" }
            );
            updateMembersData((current) => ({
                ...current,
                members: current.members.filter(
                    (currentMember) => currentMember.id !== member.id
                ),
            }));
            setNotice("Member removed.");
            await refreshWorkspaces();
        } catch (removeError) {
            setNotice(
                removeError instanceof Error
                    ? removeError.message
                    : "Failed to remove member."
            );
        }
    };

    const revokeInvite = async (invite: WorkspaceInvite) => {
        if (!window.confirm(`Revoke invite for ${invite.email}?`)) {
            return;
        }

        try {
            await fetchJson<{ ok: boolean }>(
                `/api/workspaces/${workspaceId}/invites/${invite.id}`,
                { method: "DELETE" }
            );
            membersCache.delete(workspaceId);
            await loadMembers(undefined, { force: true, keepCurrentData: true });
            setNotice("Invite revoked.");
        } catch (revokeError) {
            setNotice(
                revokeError instanceof Error
                    ? revokeError.message
                    : "Failed to revoke invite."
            );
        }
    };

    const memberRows = useMemo(() => data?.members ?? [], [data?.members]);
    const inviteRows = useMemo(() => data?.invites ?? [], [data?.invites]);
    const filteredMembers = useMemo(() => {
        const query = normalizeSearch(debouncedMemberSearch);
        const rows = memberRows.filter((member) => {
            if (query && !getMemberSearchText(member).toLowerCase().includes(query)) {
                return false;
            }

            if (!matchesRoleFilter(member.role, memberRoleFilter)) {
                return false;
            }

            if (!matchesAccessFilter(member, memberAccessFilter)) {
                return false;
            }

            if (memberActionFilter === "CAN_EDIT" && !member.canEdit) {
                return false;
            }

            if (memberActionFilter === "CAN_REMOVE" && !member.canRemove) {
                return false;
            }

            return true;
        });

        return sortMembers(rows, memberSort);
    }, [
        debouncedMemberSearch,
        memberAccessFilter,
        memberActionFilter,
        memberRoleFilter,
        memberRows,
        memberSort,
    ]);
    const filteredInvites = useMemo(() => {
        const query = normalizeSearch(debouncedInviteSearch);
        const now = filterNow;
        const expiresSoonThreshold = now + 7 * 24 * 60 * 60 * 1000;
        const rows = inviteRows.filter((invite) => {
            const expiresAt = new Date(invite.expiresAt).getTime();

            if (query && !getInviteSearchText(invite).toLowerCase().includes(query)) {
                return false;
            }

            if (!matchesRoleFilter(invite.role, inviteRoleFilter)) {
                return false;
            }

            if (!matchesAccessFilter(invite, inviteAccessFilter)) {
                return false;
            }

            if (inviteStatusFilter !== "ALL" && invite.status !== inviteStatusFilter) {
                return false;
            }

            if (inviteDeliveryFilter === "SENT" && !invite.emailSentAt) {
                return false;
            }

            if (inviteDeliveryFilter === "NOT_SENT" && invite.emailSentAt) {
                return false;
            }

            if (inviteExpiryFilter === "ACTIVE" && expiresAt <= now) {
                return false;
            }

            if (
                inviteExpiryFilter === "EXPIRING_SOON" &&
                (expiresAt <= now || expiresAt > expiresSoonThreshold)
            ) {
                return false;
            }

            if (inviteExpiryFilter === "EXPIRED" && expiresAt > now) {
                return false;
            }

            if (inviteActionFilter === "CAN_REVOKE" && !invite.canRevoke) {
                return false;
            }

            return true;
        });

        return sortInvites(rows, inviteSort);
    }, [
        debouncedInviteSearch,
        filterNow,
        inviteAccessFilter,
        inviteActionFilter,
        inviteDeliveryFilter,
        inviteExpiryFilter,
        inviteRoleFilter,
        inviteStatusFilter,
        inviteRows,
        inviteSort,
    ]);
    const memberPageState = useMemo(
        () => paginateRows(filteredMembers, memberPage, memberPageSize),
        [filteredMembers, memberPage, memberPageSize]
    );
    const invitePageState = useMemo(
        () => paginateRows(filteredInvites, invitePage, invitePageSize),
        [filteredInvites, invitePage, invitePageSize]
    );
    const isMemberSearchDebouncing =
        memberSearch.trim() !== debouncedMemberSearch.trim();
    const isInviteSearchDebouncing =
        inviteSearch.trim() !== debouncedInviteSearch.trim();

    const clearMemberFilters = () => {
        setMemberSearch("");
        setMemberRoleFilter("ALL");
        setMemberAccessFilter("ALL");
        setMemberActionFilter("ALL");
        setMemberSort("name-asc");
        setMemberPage(1);
        setMemberPageSize(PAGE_SIZE_OPTIONS[0]);
    };

    const clearInviteFilters = () => {
        setInviteSearch("");
        setInviteRoleFilter("ALL");
        setInviteAccessFilter("ALL");
        setInviteDeliveryFilter("ALL");
        setInviteExpiryFilter("ALL");
        setInviteStatusFilter("ALL");
        setInviteActionFilter("ALL");
        setInviteSort("newest");
        setInvitePage(1);
        setInvitePageSize(PAGE_SIZE_OPTIONS[0]);
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
                <section className="shrink-0 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                            Workspace members
                        </p>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                            {workspace?.name ?? data?.workspaceName ?? "Members"}
                        </h1>
                    </div>

                    {data?.canManage ? (
                        <Button type="button" size="sm" onClick={openInviteDialog}>
                            <UserPlus />
                            Invite member
                        </Button>
                    ) : null}
                </section>

                {notice ? (
                    <div className="shrink-0 flex items-center justify-between gap-3 border border-border bg-card px-3 py-2 text-sm text-foreground">
                        <span>{notice}</span>
                        <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => setNotice(null)}
                        >
                            <X />
                        </Button>
                    </div>
                ) : null}

                {error ? (
                    <p className="shrink-0 border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                        {error}
                    </p>
                ) : null}

                {isLoading ? (
                    <MemberPageSkeleton />
                ) : data ? (
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as MembersTab)}
                        className="min-h-0 flex-1 gap-0 overflow-hidden border border-border bg-card"
                    >
                        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                            <TabsList variant="line" className="h-9">
                                <TabsTrigger value="members" className="px-3">
                                    <Users className="size-4" />
                                    Members
                                </TabsTrigger>
                                <TabsTrigger value="invites" className="px-3">
                                    <Mail className="size-4" />
                                    Invites
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="members" className="m-0 flex min-h-0 flex-col overflow-hidden">
                                <MemberFilters
                                    search={memberSearch}
                                    roleFilter={memberRoleFilter}
                                    accessFilter={memberAccessFilter}
                                    actionFilter={memberActionFilter}
                                    sort={memberSort}
                                    isDebouncing={isMemberSearchDebouncing}
                                    onSearchChange={(value) => {
                                        setMemberSearch(value);
                                        setMemberPage(1);
                                    }}
                                    onRoleFilterChange={(value) => {
                                        setMemberRoleFilter(value);
                                        setMemberPage(1);
                                    }}
                                    onAccessFilterChange={(value) => {
                                        setMemberAccessFilter(value);
                                        setMemberPage(1);
                                    }}
                                    onActionFilterChange={(value) => {
                                        setMemberActionFilter(value);
                                        setMemberPage(1);
                                    }}
                                    onSortChange={(value) => {
                                        setMemberSort(value);
                                        setMemberPage(1);
                                    }}
                                    onClear={clearMemberFilters}
                                />

                                {memberPageState.rows.length > 0 ? (
                                    <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                                        {memberPageState.rows.map((member) => (
                                            <MemberRow
                                                key={member.id}
                                                member={member}
                                                onEdit={() => openEditDialog(member)}
                                                onRemove={() => {
                                                    void removeMember(member);
                                                }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyFilteredState
                                        title="No members match"
                                        description="Adjust search, role, access, action, or sort filters."
                                    />
                                )}

                                <PaginationControls
                                    totalCount={filteredMembers.length}
                                    pageState={memberPageState}
                                    pageSize={memberPageSize}
                                    onPageChange={setMemberPage}
                                    onPageSizeChange={(pageSize) => {
                                        setMemberPageSize(pageSize);
                                        setMemberPage(1);
                                    }}
                                />
                        </TabsContent>
                        <TabsContent value="invites" className="m-0 flex min-h-0 flex-col overflow-hidden">
                                <InviteFilters
                                    search={inviteSearch}
                                    roleFilter={inviteRoleFilter}
                                    accessFilter={inviteAccessFilter}
                                    deliveryFilter={inviteDeliveryFilter}
                                    expiryFilter={inviteExpiryFilter}
                                    statusFilter={inviteStatusFilter}
                                    actionFilter={inviteActionFilter}
                                    sort={inviteSort}
                                    isDebouncing={isInviteSearchDebouncing}
                                    onSearchChange={(value) => {
                                        setInviteSearch(value);
                                        setInvitePage(1);
                                    }}
                                    onRoleFilterChange={(value) => {
                                        setInviteRoleFilter(value);
                                        setInvitePage(1);
                                    }}
                                    onAccessFilterChange={(value) => {
                                        setInviteAccessFilter(value);
                                        setInvitePage(1);
                                    }}
                                    onDeliveryFilterChange={(value) => {
                                        setInviteDeliveryFilter(value);
                                        setInvitePage(1);
                                    }}
                                    onExpiryFilterChange={(value) => {
                                        setInviteExpiryFilter(value);
                                        setInvitePage(1);
                                    }}
                                    onStatusFilterChange={(value) => {
                                        setInviteStatusFilter(value);
                                        setInvitePage(1);
                                    }}
                                    onActionFilterChange={(value) => {
                                        setInviteActionFilter(value);
                                        setInvitePage(1);
                                    }}
                                    onSortChange={(value) => {
                                        setInviteSort(value);
                                        setInvitePage(1);
                                    }}
                                    onClear={clearInviteFilters}
                                />

                                {inviteRows.length === 0 ? (
                                    <EmptyFilteredState
                                        title="No invites"
                                        description="Invite a teammate to create the first invite."
                                    />
                                ) : invitePageState.rows.length > 0 ? (
                                    <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                                        {invitePageState.rows.map((invite) => (
                                            <InviteRow
                                                key={invite.id}
                                                invite={invite}
                                                onRevoke={() => {
                                                    void revokeInvite(invite);
                                                }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyFilteredState
                                        title="No invites match"
                                        description="Adjust search, role, access, delivery, expiry, or action filters."
                                    />
                                )}

                                <PaginationControls
                                    totalCount={filteredInvites.length}
                                    pageState={invitePageState}
                                    pageSize={invitePageSize}
                                    onPageChange={setInvitePage}
                                    onPageSizeChange={(pageSize) => {
                                        setInvitePageSize(pageSize);
                                        setInvitePage(1);
                                    }}
                                />
                        </TabsContent>
                    </Tabs>
                ) : null}

                <MemberAccessDialog
                    state={dialogState}
                    draft={draft}
                    projects={data?.projects ?? []}
                    formError={formError}
                    isSubmitting={isSubmitting}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            closeDialog();
                        }
                    }}
                    onDraftChange={setDraft}
                    onProjectChange={upsertProjectDraft}
                    onSubmit={(event) => {
                        void handleSubmit(event);
                    }}
                />
        </div>
    );
}

function SearchControl({
    label,
    value,
    placeholder,
    isDebouncing,
    onChange,
}: {
    label: string;
    value: string;
    placeholder: string;
    isDebouncing: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block min-w-0 flex-1 text-xs tracking-wide text-muted-foreground uppercase">
            {label}
            <div className="relative mt-2">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    className="h-9 w-full border border-border bg-background pr-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
                />
            </div>
            {isDebouncing ? (
                <span className="mt-1 block text-[11px] normal-case tracking-normal text-muted-foreground">
                    Updating results...
                </span>
            ) : null}
        </label>
    );
}

function FilterChoiceGroup<TValue extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: TValue;
    options: FilterOption<TValue>[];
    onChange: (value: TValue) => void;
}) {
    return (
        <div>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <div className="space-y-0.5">
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        className={cn(
                            "justify-between",
                            option.value === value &&
                                "bg-accent text-accent-foreground"
                        )}
                        onSelect={(event) => {
                            event.preventDefault();
                            onChange(option.value);
                        }}
                    >
                        <span>{option.label}</span>
                        {option.value === value ? (
                            <span className="text-xs text-muted-foreground">Selected</span>
                        ) : null}
                    </DropdownMenuItem>
                ))}
            </div>
        </div>
    );
}

function FilterDropdown({
    activeCount,
    children,
}: {
    activeCount: number;
    children: ReactNode;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="shrink-0">
                    <SlidersHorizontal />
                    Filters
                    {activeCount > 0 ? (
                        <span className="border border-current/25 px-1.5 py-0.5 text-[10px]">
                            {activeCount}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-72 overflow-y-auto"
            >
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function AppliedFilterChips({
    chips,
    onClear,
}: {
    chips: AppliedFilterChip[];
    onClear: () => void;
}) {
    if (chips.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
                <button
                    key={chip.id}
                    type="button"
                    className="inline-flex h-7 max-w-full items-center gap-1 border border-border bg-background px-2 text-xs text-foreground hover:bg-muted"
                    onClick={chip.onRemove}
                    title={`Remove ${chip.label}`}
                >
                    <span className="truncate">{chip.label}</span>
                    <X className="size-3" />
                </button>
            ))}
            <Button type="button" size="xs" variant="ghost" onClick={onClear}>
                Clear all
            </Button>
        </div>
    );
}

function MemberFilters({
    search,
    roleFilter,
    accessFilter,
    actionFilter,
    sort,
    isDebouncing,
    onSearchChange,
    onRoleFilterChange,
    onAccessFilterChange,
    onActionFilterChange,
    onSortChange,
    onClear,
}: {
    search: string;
    roleFilter: RoleFilterValue;
    accessFilter: AccessFilterValue;
    actionFilter: MemberActionFilterValue;
    sort: MemberSortValue;
    isDebouncing: boolean;
    onSearchChange: (value: string) => void;
    onRoleFilterChange: (value: RoleFilterValue) => void;
    onAccessFilterChange: (value: AccessFilterValue) => void;
    onActionFilterChange: (value: MemberActionFilterValue) => void;
    onSortChange: (value: MemberSortValue) => void;
    onClear: () => void;
}) {
    const chips: AppliedFilterChip[] = [
        ...(search.trim()
            ? [
                {
                    id: "search",
                    label: `Search: ${search.trim()}`,
                    onRemove: () => onSearchChange(""),
                },
            ]
            : []),
        ...(roleFilter !== "ALL"
            ? [
                {
                    id: "role",
                    label: `Role: ${roleFilterLabels[roleFilter]}`,
                    onRemove: () => onRoleFilterChange("ALL"),
                },
            ]
            : []),
        ...(accessFilter !== "ALL"
            ? [
                {
                    id: "access",
                    label: `Access: ${accessFilterLabels[accessFilter]}`,
                    onRemove: () => onAccessFilterChange("ALL"),
                },
            ]
            : []),
        ...(actionFilter !== "ALL"
            ? [
                {
                    id: "actions",
                    label: `Actions: ${memberActionFilterLabels[actionFilter]}`,
                    onRemove: () => onActionFilterChange("ALL"),
                },
            ]
            : []),
        ...(sort !== "name-asc"
            ? [
                {
                    id: "sort",
                    label: `Sort: ${memberSortLabels[sort]}`,
                    onRemove: () => onSortChange("name-asc"),
                },
            ]
            : []),
    ];

    return (
        <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <SearchControl
                    label="Search members"
                    value={search}
                    placeholder="Name, email, role, project, environment"
                    isDebouncing={isDebouncing}
                    onChange={onSearchChange}
                />
                <FilterDropdown activeCount={chips.length}>
                    <FilterChoiceGroup
                        label="Role"
                        value={roleFilter}
                        options={memberRoleFilterOptions}
                        onChange={onRoleFilterChange}
                    />
                    <DropdownMenuSeparator />
                    <FilterChoiceGroup
                        label="Access"
                        value={accessFilter}
                        options={accessFilterOptions}
                        onChange={onAccessFilterChange}
                    />
                    <DropdownMenuSeparator />
                    <FilterChoiceGroup
                        label="Actions"
                        value={actionFilter}
                        options={memberActionFilterOptions}
                        onChange={onActionFilterChange}
                    />
                    <DropdownMenuSeparator />
                    <FilterChoiceGroup
                        label="Sort"
                        value={sort}
                        options={memberSortOptions}
                        onChange={onSortChange}
                    />
                </FilterDropdown>
            </div>
            <AppliedFilterChips chips={chips} onClear={onClear} />
        </div>
    );
}

function InviteFilters({
    search,
    roleFilter,
    accessFilter,
    deliveryFilter,
    expiryFilter,
    statusFilter,
    actionFilter,
    sort,
    isDebouncing,
    onSearchChange,
    onRoleFilterChange,
    onAccessFilterChange,
    onDeliveryFilterChange,
    onExpiryFilterChange,
    onStatusFilterChange,
    onActionFilterChange,
    onSortChange,
    onClear,
}: {
    search: string;
    roleFilter: RoleFilterValue;
    accessFilter: AccessFilterValue;
    deliveryFilter: InviteDeliveryFilterValue;
    expiryFilter: InviteExpiryFilterValue;
    statusFilter: InviteStatusFilterValue;
    actionFilter: InviteActionFilterValue;
    sort: InviteSortValue;
    isDebouncing: boolean;
    onSearchChange: (value: string) => void;
    onRoleFilterChange: (value: RoleFilterValue) => void;
    onAccessFilterChange: (value: AccessFilterValue) => void;
    onDeliveryFilterChange: (value: InviteDeliveryFilterValue) => void;
    onExpiryFilterChange: (value: InviteExpiryFilterValue) => void;
    onStatusFilterChange: (value: InviteStatusFilterValue) => void;
    onActionFilterChange: (value: InviteActionFilterValue) => void;
    onSortChange: (value: InviteSortValue) => void;
    onClear: () => void;
}) {
    const chips: AppliedFilterChip[] = [
        ...(search.trim()
            ? [
                {
                    id: "search",
                    label: `Search: ${search.trim()}`,
                    onRemove: () => onSearchChange(""),
                },
            ]
            : []),
        ...(roleFilter !== "ALL"
            ? [
                {
                    id: "role",
                    label: `Role: ${roleFilterLabels[roleFilter]}`,
                    onRemove: () => onRoleFilterChange("ALL"),
                },
            ]
            : []),
        ...(accessFilter !== "ALL"
            ? [
                {
                    id: "access",
                    label: `Access: ${accessFilterLabels[accessFilter]}`,
                    onRemove: () => onAccessFilterChange("ALL"),
                },
            ]
            : []),
        ...(deliveryFilter !== "ALL"
            ? [
                {
                    id: "delivery",
                    label: `Delivery: ${inviteDeliveryFilterLabels[deliveryFilter]}`,
                    onRemove: () => onDeliveryFilterChange("ALL"),
                },
            ]
            : []),
        ...(statusFilter !== "ALL"
            ? [
                {
                    id: "status",
                    label: `Status: ${inviteStatusFilterLabels[statusFilter]}`,
                    onRemove: () => onStatusFilterChange("ALL"),
                },
            ]
            : []),
        ...(expiryFilter !== "ALL"
            ? [
                {
                    id: "expiry",
                    label: `Expiry: ${inviteExpiryFilterLabels[expiryFilter]}`,
                    onRemove: () => onExpiryFilterChange("ALL"),
                },
            ]
            : []),
        ...(actionFilter !== "ALL"
            ? [
                {
                    id: "actions",
                    label: `Actions: ${inviteActionFilterLabels[actionFilter]}`,
                    onRemove: () => onActionFilterChange("ALL"),
                },
            ]
            : []),
        ...(sort !== "newest"
            ? [
                {
                    id: "sort",
                    label: `Sort: ${inviteSortLabels[sort]}`,
                    onRemove: () => onSortChange("newest"),
                },
            ]
            : []),
    ];

    return (
        <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <SearchControl
                    label="Search invites"
                    value={search}
                    placeholder="Email, role, project, environment"
                    isDebouncing={isDebouncing}
                    onChange={onSearchChange}
                />
                <FilterDropdown activeCount={chips.length}>
                    <FilterChoiceGroup
                        label="Role"
                        value={roleFilter}
                        options={inviteRoleFilterOptions}
                        onChange={onRoleFilterChange}
                    />
                    <DropdownMenuSeparator />
                    <FilterChoiceGroup
                        label="Access"
                        value={accessFilter}
                        options={accessFilterOptions}
                        onChange={onAccessFilterChange}
                    />
                    <DropdownMenuSeparator />
                    <FilterChoiceGroup
                        label="Delivery"
                        value={deliveryFilter}
                        options={inviteDeliveryFilterOptions}
                        onChange={onDeliveryFilterChange}
                    />
                    <DropdownMenuSeparator />
                    <FilterChoiceGroup
                        label="Status"
                        value={statusFilter}
                        options={inviteStatusFilterOptions}
                        onChange={onStatusFilterChange}
                    />
                    <DropdownMenuSeparator />
                    <FilterChoiceGroup
                        label="Expiry"
                        value={expiryFilter}
                        options={inviteExpiryFilterOptions}
                        onChange={onExpiryFilterChange}
                    />
                    <DropdownMenuSeparator />
                    <FilterChoiceGroup
                        label="Actions"
                        value={actionFilter}
                        options={inviteActionFilterOptions}
                        onChange={onActionFilterChange}
                    />
                    <DropdownMenuSeparator />
                    <FilterChoiceGroup
                        label="Sort"
                        value={sort}
                        options={inviteSortOptions}
                        onChange={onSortChange}
                    />
                </FilterDropdown>
            </div>
            <AppliedFilterChips chips={chips} onClear={onClear} />
        </div>
    );
}

function EmptyFilteredState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

function PaginationControls<T>({
    totalCount,
    pageState,
    pageSize,
    onPageChange,
    onPageSizeChange,
}: {
    totalCount: number;
    pageState: PaginationState<T>;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}) {
    const from = totalCount === 0 ? 0 : pageState.startIndex + 1;
    const to = pageState.endIndex;

    return (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <div className="text-sm text-muted-foreground">
                Showing {from}-{to} of {totalCount}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Select
                    value={String(pageSize)}
                    onValueChange={(value) => onPageSizeChange(Number(value))}
                >
                    <SelectTrigger className="w-28">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                                {option} / page
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                    Page {pageState.currentPage} of {pageState.totalPages}
                </span>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pageState.currentPage <= 1}
                    onClick={() => onPageChange(pageState.currentPage - 1)}
                >
                    Prev
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pageState.currentPage >= pageState.totalPages}
                    onClick={() => onPageChange(pageState.currentPage + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

function MemberPageSkeleton() {
    return (
        <section className="flex min-h-0 flex-1 flex-col border border-border bg-card">
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-4 w-28" />
            </div>
            <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="min-w-0 flex-1">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="mt-2 h-9 w-full" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-7 w-32" />
                </div>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={index}
                        className="grid gap-3 px-4 py-4 lg:grid-cols-[1.5fr_1fr_auto] lg:items-center"
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                            <Skeleton className="mt-2 h-4 w-56" />
                        </div>
                        <div>
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="mt-2 h-3 w-28" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-7 w-16" />
                            <Skeleton className="h-7 w-20" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                <Skeleton className="h-4 w-28" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                </div>
            </div>
        </section>
    );
}

function RoleBadge({ role }: { role: WorkspaceRoleValue }) {
    return (
        <Badge variant={role === "OWNER" ? "default" : role === "ADMIN" ? "secondary" : "outline"}>
            <Shield className="size-3" />
            {workspaceRoleLabels[role]}
        </Badge>
    );
}

function InviteStatusBadge({ status }: { status: WorkspaceInviteStatusValue }) {
    const variant =
        status === "ACCEPTED"
            ? "default"
            : status === "REVOKED"
                ? "destructive"
                : "outline";

    return (
        <Badge variant={variant}>
            {inviteStatusFilterLabels[status]}
        </Badge>
    );
}

function formatInviteStatusDetail(invite: WorkspaceInvite) {
    if (invite.status === "ACCEPTED") {
        return invite.acceptedAt
            ? `Accepted ${formatTimeAgo(invite.acceptedAt)}`
            : "Accepted";
    }

    if (invite.status === "REVOKED") {
        return invite.revokedAt
            ? `Revoked ${formatTimeAgo(invite.revokedAt)}`
            : "Revoked";
    }

    return `Expires ${formatTimeAgo(invite.expiresAt)}`;
}

function getInviteActorDetail(invite: WorkspaceInvite) {
    if (invite.status === "ACCEPTED" && invite.acceptedByEmail) {
        return `Accepted by ${invite.acceptedByEmail}`;
    }

    if (invite.status === "REVOKED" && invite.revokedByEmail) {
        return `Revoked by ${invite.revokedByEmail}`;
    }

    return invite.invitedByEmail ? `Invited by ${invite.invitedByEmail}` : null;
}

function getInviteAccessDetails(invite: WorkspaceInvite) {
    if (invite.role === "OWNER" || invite.role === "ADMIN") {
        return ["All workspace projects and environments"];
    }

    if (invite.projectAccessScope === "ALL_PROJECTS") {
        return [
            `${projectRoleLabels[invite.defaultProjectRole]} on all projects`,
            `Default environments: ${environmentAccessLabels[invite.defaultEnvironmentAccessScope]}`,
        ];
    }

    if (invite.projects.length === 0) {
        return ["No selected project access"];
    }

    return invite.projects.map((project) => {
        const environments =
            project.environmentAccessScope === "ALL_ENVIRONMENTS"
                ? environmentAccessLabels.ALL_ENVIRONMENTS
                : project.environments.length > 0
                    ? project.environments
                        .map((environment) => environmentTypeLabels[environment])
                        .join(", ")
                    : "No environments selected";

        return `${project.projectName}: ${projectRoleLabels[project.role]}, ${environments}`;
    });
}

function MemberRow({
    member,
    onEdit,
    onRemove,
}: {
    member: WorkspaceMember;
    onEdit: () => void;
    onRemove: () => void;
}) {
    return (
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[1.5fr_1fr_auto] lg:items-center">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                        {member.name ?? member.email}
                    </p>
                    <RoleBadge role={member.role} />
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                    {member.email}
                </p>
            </div>

            <div className="text-sm text-muted-foreground">
                <p>{formatAccessSummary(member)}</p>
                <p className="mt-1 text-xs">Added {formatTimeAgo(member.createdAt)}</p>
            </div>

            <div className="flex items-center gap-2">
                {member.canEdit ? (
                    <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                        <Pencil />
                        Edit
                    </Button>
                ) : null}
                {member.canRemove ? (
                    <Button type="button" size="sm" variant="destructive" onClick={onRemove}>
                        <Trash2 />
                        Remove
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

function InviteRow({
    invite,
    onRevoke,
}: {
    invite: WorkspaceInvite;
    onRevoke: () => void;
}) {
    const actorDetail = getInviteActorDetail(invite);
    const accessDetails = getInviteAccessDetails(invite);

    return (
        <div className="grid gap-4 px-4 py-4 xl:grid-cols-[1.2fr_1.7fr_auto] xl:items-start">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                        {invite.email}
                    </p>
                    <RoleBadge role={invite.role} />
                    <InviteStatusBadge status={invite.status} />
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>{formatInviteStatusDetail(invite)}</p>
                    <p>Created {formatTimeAgo(invite.createdAt)}</p>
                    {actorDetail ? <p>{actorDetail}</p> : null}
                    <p>{invite.emailSentAt ? `Email sent ${formatTimeAgo(invite.emailSentAt)}` : "Email not sent"}</p>
                </div>
            </div>

            <div className="min-w-0 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{formatAccessSummary(invite)}</p>
                <div className="mt-2 space-y-1">
                    {accessDetails.map((detail) => (
                        <p key={detail} className="text-xs">
                            {detail}
                        </p>
                    ))}
                </div>
            </div>

            {invite.canRevoke ? (
                <Button type="button" size="sm" variant="destructive" onClick={onRevoke}>
                    <Trash2 />
                    Revoke
                </Button>
            ) : null}
        </div>
    );
}

function MemberAccessDialog({
    state,
    draft,
    projects,
    formError,
    isSubmitting,
    onOpenChange,
    onDraftChange,
    onProjectChange,
    onSubmit,
}: {
    state: DialogState | null;
    draft: MemberFormDraft;
    projects: WorkspaceMemberProjectOption[];
    formError: string | null;
    isSubmitting: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onDraftChange: (draft: MemberFormDraft) => void;
    onProjectChange: (
        projectId: string,
        update: Partial<MemberProjectAccessInput> | null
    ) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const isOpen = Boolean(state);
    const isInvite = state?.type === "invite";
    const selectedProjects = useMemo(
        () => new Map(draft.projects.map((project) => [project.projectId, project])),
        [draft.projects]
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isInvite ? "Invite member" : "Edit member"}</DialogTitle>
                    <DialogDescription>
                        Assign a workspace role, project role, and environment access.
                    </DialogDescription>
                </DialogHeader>

                {state ? (
                    <form className="space-y-4" onSubmit={onSubmit}>
                        {isInvite ? (
                            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                Email
                                <input
                                    type="email"
                                    value={draft.email}
                                    onChange={(event) =>
                                        onDraftChange({
                                            ...draft,
                                            email: event.target.value,
                                        })
                                    }
                                    placeholder="teammate@example.com"
                                    maxLength={254}
                                    className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                    required
                                />
                            </label>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                Workspace role
                                <Select
                                    value={draft.role}
                                    onValueChange={(role) =>
                                        onDraftChange({
                                            ...draft,
                                            role: role as WorkspaceRoleValue,
                                        })
                                    }
                                >
                                    <SelectTrigger className="mt-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                        <SelectItem value="MEMBER">Member</SelectItem>
                                    </SelectContent>
                                </Select>
                            </label>

                            {draft.role === "MEMBER" ? (
                                <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                    Project access
                                    <Select
                                        value={draft.projectAccessScope}
                                        onValueChange={(scope) =>
                                            onDraftChange({
                                                ...draft,
                                                projectAccessScope:
                                                    scope as ProjectAccessScopeValue,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="mt-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SELECTED_PROJECTS">
                                                Selected projects
                                            </SelectItem>
                                            <SelectItem value="ALL_PROJECTS">
                                                All projects
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </label>
                            ) : null}
                        </div>

                        {draft.role === "MEMBER" &&
                        draft.projectAccessScope === "ALL_PROJECTS" ? (
                            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                Role on all projects
                                <Select
                                    value={draft.defaultProjectRole}
                                    onValueChange={(role) =>
                                        onDraftChange({
                                            ...draft,
                                            defaultProjectRole: role as ProjectRoleValue,
                                        })
                                    }
                                >
                                    <SelectTrigger className="mt-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CONTRIBUTOR">
                                            Contributor
                                        </SelectItem>
                                        <SelectItem value="VIEWER">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </label>
                        ) : null}

                        {draft.role === "MEMBER" &&
                        draft.projectAccessScope === "SELECTED_PROJECTS" ? (
                            <fieldset className="space-y-2">
                                <legend className="text-xs tracking-wide text-muted-foreground uppercase">
                                    Projects
                                </legend>
                                <div className="space-y-2">
                                    {projects.map((project) => {
                                        const selected = selectedProjects.get(project.id);

                                        return (
                                            <ProjectAccessRow
                                                key={project.id}
                                                project={project}
                                                selected={selected}
                                                onChange={onProjectChange}
                                            />
                                        );
                                    })}
                                </div>
                            </fieldset>
                        ) : null}

                        {draft.role !== "MEMBER" ? (
                            <p className="border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                                {workspaceRoleLabels[draft.role]} gets all workspace projects and environments.
                            </p>
                        ) : null}

                        {formError ? (
                            <p className="text-sm text-red-300">{formError}</p>
                        ) : null}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : isInvite ? "Send invite" : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function ProjectAccessRow({
    project,
    selected,
    onChange,
}: {
    project: WorkspaceMemberProjectOption;
    selected?: MemberProjectAccessInput;
    onChange: (
        projectId: string,
        update: Partial<MemberProjectAccessInput> | null
    ) => void;
}) {
    return (
        <div className="border border-border bg-background px-3 py-3">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                    type="checkbox"
                    checked={Boolean(selected)}
                    onChange={(event) =>
                        onChange(
                            project.id,
                            event.target.checked
                                ? {
                                    role: "VIEWER",
                                    environmentAccessScope: "ALL_ENVIRONMENTS",
                                    environments: [],
                                }
                                : null
                        )
                    }
                    className="size-4"
                />
                {project.name}
            </label>

            {selected ? (
                <div className="mt-3 grid gap-3 lg:grid-cols-[12rem_14rem_1fr]">
                    <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                        Project role
                        <Select
                            value={selected.role}
                            onValueChange={(role) =>
                                onChange(project.id, {
                                    role: role as ProjectRoleValue,
                                })
                            }
                        >
                            <SelectTrigger className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                    </label>

                    <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                        Environments
                        <Select
                            value={selected.environmentAccessScope}
                            onValueChange={(scope) =>
                                onChange(project.id, {
                                    environmentAccessScope:
                                        scope as EnvironmentAccessScopeValue,
                                    environments:
                                        scope === "ALL_ENVIRONMENTS"
                                            ? []
                                            : selected.environments,
                                })
                            }
                        >
                            <SelectTrigger className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL_ENVIRONMENTS">
                                    All environments
                                </SelectItem>
                                <SelectItem value="SELECTED_ENVIRONMENTS">
                                    Selected environments
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </label>

                    {selected.environmentAccessScope === "SELECTED_ENVIRONMENTS" ? (
                        <div className="space-y-2">
                            <p className="text-xs tracking-wide text-muted-foreground uppercase">
                                Select
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {project.environments.length > 0 ? (
                                    project.environments.map((environment) => (
                                        <label
                                            key={environment}
                                            className="flex items-center gap-2 border border-border bg-card px-2 py-1 text-xs text-foreground"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected.environments.includes(
                                                    environment
                                                )}
                                                onChange={(event) => {
                                                    const environments = event.target.checked
                                                        ? [
                                                            ...selected.environments,
                                                            environment,
                                                        ]
                                                        : selected.environments.filter(
                                                            (current) =>
                                                                current !== environment
                                                        );
                                                    onChange(project.id, { environments });
                                                }}
                                                className="size-3.5"
                                            />
                                            {environmentTypeLabels[environment]}
                                        </label>
                                    ))
                                ) : (
                                    <span className="text-sm text-muted-foreground">
                                        No environments yet.
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="self-end text-sm text-muted-foreground">
                            {environmentAccessLabels[selected.environmentAccessScope]}
                        </p>
                    )}
                </div>
            ) : null}
        </div>
    );
}
