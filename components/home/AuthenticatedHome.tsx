"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuthenticated } from "@/contexts/authenticated";
import { useWorkspace } from "@/contexts/workspace";
import debounce from "lodash/debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimeAgo } from "@/utils";
import type {
    DeleteProjectResponse,
    RenameProjectResponse,
} from "@/types/project";
import type { ApiErrorPayload, WorkspaceProjectSummary } from "@/types/workspace";

async function fetchJson<T>(
    input: RequestInfo,
    init?: RequestInit
): Promise<T> {
    const response = await fetch(input, init);
    const payload = (await response.json().catch(() => null)) as
        | ApiErrorPayload
        | T
        | null;

    if (!response.ok) {
        const message =
            payload &&
                typeof payload === "object" &&
                "error" in payload &&
                typeof payload.error === "string"
                ? payload.error
                : "Request failed.";

        throw new Error(message);
    }

    if (!payload) {
        throw new Error("Received an empty response from the server.");
    }

    return payload as T;
}

export default function AuthenticatedHome() {
    const { user } = useAuthenticated();
    const {
        workspaces,
        activeWorkspace,
        isLoading,
        isWorkspaceLoading,
        isCreatingWorkspace,
        error,
        createWorkspace,
    } = useWorkspace();

    const [workspaceName, setWorkspaceName] = useState("");
    const [workspaceDescription, setWorkspaceDescription] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectCards, setProjectCards] = useState<WorkspaceProjectSummary[]>([]);
    const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
    const [projectDraftName, setProjectDraftName] = useState("");
    const [isSavingProjectName, setIsSavingProjectName] = useState(false);
    const [projectIdPendingDelete, setProjectIdPendingDelete] = useState<string | null>(null);
    const [isDeletingProject, setIsDeletingProject] = useState(false);
    const [projectActionError, setProjectActionError] = useState<string | null>(null);

    // Search + pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        const handler = debounce((val: string) => {
            setDebouncedQuery(val);
            setPage(1);
        }, 300);

        handler(searchQuery);

        return () => {
            handler.cancel();
        };
    }, [searchQuery]);

    useEffect(() => {
        setProjectCards(activeWorkspace?.projects ?? []);
    }, [activeWorkspace?.id, activeWorkspace?.projects]);

    const canManageProjects =
        activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";

    const filteredProjects = useMemo(() => {
        if (!activeWorkspace) return [];
        const q = debouncedQuery.trim().toLowerCase();
        if (!q) return projectCards;
        return projectCards.filter((p) =>
            p.name.toLowerCase().includes(q)
        );
    }, [activeWorkspace, debouncedQuery, projectCards]);

    const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const paginated = filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const hasWorkspaces = workspaces.length > 0;

    const projectPendingDelete = useMemo(
        () =>
            projectIdPendingDelete
                ? projectCards.find((project) => project.id === projectIdPendingDelete) ?? null
                : null,
        [projectCards, projectIdPendingDelete]
    );

    const projectPendingRename = useMemo(
        () =>
            renamingProjectId
                ? projectCards.find((project) => project.id === renamingProjectId) ?? null
                : null,
        [projectCards, renamingProjectId]
    );

    const handleCreateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const name = workspaceName.trim();
        const description = workspaceDescription.trim();

        if (name.length < 2) {
            setFormError("Workspace name must be at least 2 characters.");
            return;
        }

        setIsSubmitting(true);

        try {
            await createWorkspace({
                name,
                description: description || undefined,
            });
            setWorkspaceName("");
            setWorkspaceDescription("");
            setFormError(null);
        } catch (createError) {
            setFormError(
                createError instanceof Error
                    ? createError.message
                    : "Failed to create workspace."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenRenameProject = (project: WorkspaceProjectSummary) => {
        setRenamingProjectId(project.id);
        setProjectDraftName(project.name);
        setProjectActionError(null);
    };

    const handleCloseRenameProject = () => {
        setRenamingProjectId(null);
        setProjectDraftName("");
        setProjectActionError(null);
    };

    const handleRenameProject = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!activeWorkspace || !renamingProjectId) {
            return;
        }

        const name = projectDraftName.trim();

        if (name.length < 2 || name.length > 80) {
            setProjectActionError("Project name must be between 2 and 80 characters.");
            return;
        }

        setIsSavingProjectName(true);

        try {
            const response = await fetchJson<RenameProjectResponse>(
                `/api/workspaces/${activeWorkspace.id}/projects/${renamingProjectId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ name }),
                }
            );

            setProjectCards((currentProjects) =>
                currentProjects.map((project) =>
                    project.id === renamingProjectId
                        ? {
                            ...project,
                            name: response.project.name,
                            updatedAt: response.project.updatedAt,
                        }
                        : project
                )
            );
            handleCloseRenameProject();
        } catch (renameError) {
            setProjectActionError(
                renameError instanceof Error ? renameError.message : "Failed to rename project."
            );
        } finally {
            setIsSavingProjectName(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!activeWorkspace || !projectIdPendingDelete) {
            return;
        }

        setIsDeletingProject(true);

        try {
            await fetchJson<DeleteProjectResponse>(
                `/api/workspaces/${activeWorkspace.id}/projects/${projectIdPendingDelete}`,
                {
                    method: "DELETE",
                }
            );

            setProjectCards((currentProjects) =>
                currentProjects.filter((project) => project.id !== projectIdPendingDelete)
            );
            setProjectIdPendingDelete(null);
            setProjectActionError(null);
        } catch (deleteError) {
            setProjectActionError(
                deleteError instanceof Error ? deleteError.message : "Failed to delete project."
            );
        } finally {
            setIsDeletingProject(false);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
            <Dialog
                open={Boolean(renamingProjectId)}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        handleCloseRenameProject();
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rename project</DialogTitle>
                        <DialogDescription>
                            Update the project name for {projectPendingRename?.name ?? "this project"}.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        className="space-y-3"
                        onSubmit={(event) => {
                            void handleRenameProject(event);
                        }}
                    >
                        <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                            Project name
                            <input
                                value={projectDraftName}
                                onChange={(event) => {
                                    setProjectDraftName(event.target.value);
                                    setProjectActionError(null);
                                }}
                                className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                maxLength={80}
                                autoFocus
                            />
                        </label>

                        {projectActionError ? (
                            <p className="text-sm text-red-300">{projectActionError}</p>
                        ) : null}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseRenameProject}
                                disabled={isSavingProjectName}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSavingProjectName}>
                                {isSavingProjectName ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={Boolean(projectIdPendingDelete)}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setProjectIdPendingDelete(null);
                        setProjectActionError(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete project?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{projectPendingDelete?.name ?? "this project"}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {projectActionError ? (
                        <p className="text-sm text-red-300">{projectActionError}</p>
                    ) : null}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingProject}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                void handleDeleteProject();
                            }}
                            disabled={isDeletingProject}
                        >
                            {isDeletingProject ? "Deleting..." : "Delete project"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <section className="shrink-0 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        Workspace projects
                    </p>
                    <h1 className="mt-1 text-4xl font-semibold tracking-tight text-foreground">
                        {activeWorkspace?.name ?? "Create your first workspace"}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Signed in as {user?.name ?? "Unnamed user"}
                        {user?.email ? ` (${user.email})` : ""}
                    </p>
                </div>

            </section>

            {error ? (
                <p className="shrink-0 border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                    {error}
                </p>
            ) : null}

            {!isLoading && !hasWorkspaces ? (
                <section className="shrink-0 border border-border bg-card p-5">
                    <h2 className="text-xl font-semibold text-foreground">Create Workspace</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Workspaces are isolated containers for projects, members, and access
                        policies.
                    </p>

                    <form className="mt-4 space-y-3" onSubmit={handleCreateWorkspace}>
                        <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                            Workspace name
                            <input
                                value={workspaceName}
                                onChange={(event) => setWorkspaceName(event.target.value)}
                                placeholder="Acme Platform"
                                className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                required
                            />
                        </label>

                        <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                            Description (optional)
                            <textarea
                                value={workspaceDescription}
                                onChange={(event) =>
                                    setWorkspaceDescription(event.target.value)
                                }
                                placeholder="Workspace for platform environments"
                                className="mt-2 h-20 w-full resize-none border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                            />
                        </label>

                        {formError ? (
                            <p className="text-sm text-red-300">{formError}</p>
                        ) : null}

                        <Button
                            type="submit"
                            size="sm"
                            className="border border-border bg-card text-foreground hover:bg-accent"
                            disabled={isSubmitting || isCreatingWorkspace}
                        >
                            {isSubmitting || isCreatingWorkspace
                                ? "Creating workspace..."
                                : "Create workspace"}
                        </Button>
                    </form>
                </section>
            ) : null}

            {!isLoading && activeWorkspace ? (
                <section className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border bg-card">
                    <div className="shrink-0 border-b border-border px-4 py-3">
                        <h2 className="text-xl font-semibold text-foreground">
                            Projects in {activeWorkspace.name}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {isWorkspaceLoading
                                ? "Refreshing workspace data..."
                                : `${activeWorkspace.memberCount} members • ${activeWorkspace.projectCount} projects`}
                        </p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                        {projectCards.length === 0 ? (
                            <p className="border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                                {activeWorkspace.projectAccessScope === "SELECTED_PROJECTS"
                                    ? "No project access granted yet for your member scope."
                                    : "No projects exist yet in this workspace."}
                            </p>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search projects"
                                        className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                    />

                                    <div className="mt-2 flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">{filteredProjects.length} results</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(isWorkspaceLoading || (searchQuery.trim() !== "" && searchQuery !== debouncedQuery)) ? (
                                        Array.from({ length: pageSize }).map((_, i) => (
                                            <div key={`skeleton-${i}`} className="border border-border bg-card p-4 rounded-md">
                                                <Skeleton className="h-6 w-3/4 mb-2" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </div>
                                        ))
                                    ) : paginated.length > 0 ? (
                                        paginated.map((project) => (
                                            <div
                                                key={project.id}
                                                className="border border-border bg-card p-4 transition hover:border-foreground hover:bg-accent"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <Link
                                                        href={`/${activeWorkspace.id}/projects/${project.id}`}
                                                        className="min-w-0 flex-1"
                                                    >
                                                        <div className="truncate text-lg font-semibold text-foreground">
                                                            {project.name}
                                                        </div>
                                                        <div className="mt-2 text-sm text-muted-foreground">
                                                            Updated {formatTimeAgo(project.updatedAt)}
                                                        </div>
                                                    </Link>

                                                    {canManageProjects ? (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon-xs"
                                                                    aria-label={`Actions for ${project.name}`}
                                                                    title="Project actions"
                                                                >
                                                                    <MoreHorizontal />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onSelect={() => {
                                                                        handleOpenRenameProject(project);
                                                                    }}
                                                                >
                                                                    Rename
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="text-red-300 focus:text-red-200"
                                                                    onSelect={() => {
                                                                        setProjectIdPendingDelete(project.id);
                                                                        setProjectActionError(null);
                                                                    }}
                                                                >
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-6 text-sm text-muted-foreground">No projects match your search.</div>
                                    )}
                                </div>

                            </>
                        )}
                    </div>

                    {projectCards.length > 0 ? (
                        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                            <div className="text-sm text-muted-foreground">
                                Showing {(filteredProjects.length === 0) ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredProjects.length)} of {filteredProjects.length}
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button type="button" size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                                        Prev
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </section>
            ) : null}
        </div>
    );
}
