"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAuthenticated } from "@/contexts/authenticated";
import { useWorkspace } from "@/contexts/workspace";

function formatDate(value: string) {
    return new Date(value).toLocaleString();
}

export default function AuthenticatedHome() {
    const { user } = useAuthenticated();
    const {
        workspaces,
        activeWorkspace,
        isWorkspaceLoading,
        isCreatingWorkspace,
        error,
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
