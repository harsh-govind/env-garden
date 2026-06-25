"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthenticated } from "@/contexts/authenticated";
import { useWorkspace } from "@/contexts/workspace";
import debounce from "lodash/debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimeAgo } from "@/lib/utils";

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

    const filteredProjects = useMemo(() => {
        if (!activeWorkspace) return [];
        const q = debouncedQuery.trim().toLowerCase();
        if (!q) return activeWorkspace.projects;
        return activeWorkspace.projects.filter((p) =>
            p.name.toLowerCase().includes(q)
        );
    }, [activeWorkspace, debouncedQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const paginated = filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const hasWorkspaces = workspaces.length > 0;

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

    return (
        <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
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
                        {activeWorkspace.projects.length === 0 ? (
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
                                            <Link
                                                key={project.id}
                                                href={`/${activeWorkspace.id}/projects/${project.id}`}
                                                className="border border-border bg-card p-4 transition hover:border-foreground hover:bg-accent"
                                            >
                                                <div className="text-lg font-semibold text-foreground">{project.name}</div>
                                                <div className="mt-2 text-sm text-muted-foreground">Updated {formatTimeAgo(project.updatedAt)}</div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-6 text-sm text-muted-foreground">No projects match your search.</div>
                                    )}
                                </div>

                            </>
                        )}
                    </div>

                    {activeWorkspace.projects.length > 0 ? (
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
