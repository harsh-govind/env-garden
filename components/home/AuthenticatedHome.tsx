"use client";

import {
    FolderKanban,
    LogOut,
    RefreshCw,
    ShieldCheck,
    Users,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useAuthenticated } from "@/contexts/authenticated";
import { useWorkspace } from "@/contexts/workspace";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
    return new Date(value).toLocaleString();
}

function formatAccessScope(scope: "ALL_PROJECTS" | "SELECTED_PROJECTS") {
    return scope === "ALL_PROJECTS" ? "All projects" : "Selected projects";
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
        refreshWorkspaces,
        createWorkspace,
    } = useWorkspace();

    const [workspaceName, setWorkspaceName] = useState("");
    const [workspaceDescription, setWorkspaceDescription] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        <div className="space-y-8">
            <section className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        Workspace dashboard
                    </p>
                    <h1 className="mt-1 text-4xl font-semibold tracking-tight text-foreground">
                        {activeWorkspace?.name ?? "Create your first workspace"}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Signed in as {user?.name ?? "Unnamed user"}
                        {user?.email ? ` (${user.email})` : ""}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                            void refreshWorkspaces();
                        }}
                    >
                        <RefreshCw className={cn("size-4", isLoading ? "animate-spin" : "")} />
                        Refresh
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => signOut({ callbackUrl: "/" })}
                    >
                        <LogOut className="size-4" />
                        Sign out
                    </Button>
                </div>
            </section>

            {error ? (
                <p className="border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                    {error}
                </p>
            ) : null}

            {!hasWorkspaces ? (
                <section className="border border-border bg-card p-5">
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

            {activeWorkspace ? (
                <>
                    <section className="grid gap-3 sm:grid-cols-3">
                        <article className="border border-border bg-card p-4">
                            <p className="inline-flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                                <FolderKanban className="size-3.5" />
                                Projects
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">
                                {activeWorkspace.projectCount}
                            </p>
                        </article>

                        <article className="border border-border bg-card p-4">
                            <p className="inline-flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                                <Users className="size-3.5" />
                                Members
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">
                                {activeWorkspace.memberCount}
                            </p>
                        </article>

                        <article className="border border-border bg-card p-4">
                            <p className="inline-flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                                <ShieldCheck className="size-3.5" />
                                Access
                            </p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                                Role: {activeWorkspace.role}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Scope: {formatAccessScope(activeWorkspace.projectAccessScope)}
                            </p>
                        </article>
                    </section>

                    <section className="border border-border bg-card">
                        <div className="border-b border-border px-4 py-3">
                            <h2 className="text-xl font-semibold text-foreground">
                                Projects in {activeWorkspace.name}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {isWorkspaceLoading
                                    ? "Refreshing workspace data..."
                                    : `Workspace slug: ${activeWorkspace.slug}`}
                            </p>
                        </div>

                        <div className="px-4 py-4">
                            {activeWorkspace.projects.length === 0 ? (
                                <p className="border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                                    {activeWorkspace.projectAccessScope ===
                                        "SELECTED_PROJECTS"
                                        ? "No project access granted yet for your member scope."
                                        : "No projects exist yet in this workspace."}
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-180 w-full border-collapse text-left text-sm">
                                        <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                                            <tr className="border-b border-border">
                                                <th className="py-2 pr-3 font-medium">Name</th>
                                                <th className="py-2 pr-3 font-medium">Slug</th>
                                                <th className="py-2 pr-3 font-medium">Created</th>
                                                <th className="py-2 pr-3 font-medium">Updated</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeWorkspace.projects.map((project) => (
                                                <tr
                                                    key={project.id}
                                                    className="border-b border-border/70 text-foreground"
                                                >
                                                    <td className="py-2 pr-3 font-medium text-foreground">
                                                        {project.name}
                                                    </td>
                                                    <td className="py-2 pr-3 text-muted-foreground">
                                                        {project.slug}
                                                    </td>
                                                    <td className="py-2 pr-3 text-muted-foreground">
                                                        {formatDate(project.createdAt)}
                                                    </td>
                                                    <td className="py-2 pr-3 text-muted-foreground">
                                                        {formatDate(project.updatedAt)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>

                </>
            ) : null}
        </div>
    );
}
