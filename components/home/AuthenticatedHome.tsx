"use client";

import {
    FolderKanban,
    History,
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
                    <p className="text-xs tracking-[0.18em] text-zinc-500 uppercase">
                        Workspace dashboard
                    </p>
                    <h1 className="mt-1 text-4xl font-semibold tracking-tight text-zinc-50">
                        {activeWorkspace?.name ?? "Create your first workspace"}
                    </h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        Signed in as {user?.name ?? "Unnamed user"}
                        {user?.email ? ` (${user.email})` : ""}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900 hover:text-zinc-50"
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
                        className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900 hover:text-zinc-50"
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
                <section className="border border-zinc-800 bg-[#090b11] p-5">
                    <h2 className="text-xl font-semibold text-zinc-100">Create Workspace</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                        Workspaces are isolated containers for projects, members, and access
                        policies.
                    </p>

                    <form className="mt-4 space-y-3" onSubmit={handleCreateWorkspace}>
                        <label className="block text-xs tracking-wide text-zinc-400 uppercase">
                            Workspace name
                            <input
                                value={workspaceName}
                                onChange={(event) => setWorkspaceName(event.target.value)}
                                placeholder="Acme Platform"
                                className="mt-2 w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                                required
                            />
                        </label>

                        <label className="block text-xs tracking-wide text-zinc-400 uppercase">
                            Description (optional)
                            <textarea
                                value={workspaceDescription}
                                onChange={(event) =>
                                    setWorkspaceDescription(event.target.value)
                                }
                                placeholder="Workspace for platform environments"
                                className="mt-2 h-20 w-full resize-none border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                            />
                        </label>

                        {formError ? (
                            <p className="text-sm text-red-300">{formError}</p>
                        ) : null}

                        <Button
                            type="submit"
                            size="sm"
                            className="border border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900"
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
                        <article className="border border-zinc-800 bg-[#090b11] p-4">
                            <p className="inline-flex items-center gap-2 text-xs tracking-wide text-zinc-400 uppercase">
                                <FolderKanban className="size-3.5" />
                                Projects
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-zinc-100">
                                {activeWorkspace.projectCount}
                            </p>
                        </article>

                        <article className="border border-zinc-800 bg-[#090b11] p-4">
                            <p className="inline-flex items-center gap-2 text-xs tracking-wide text-zinc-400 uppercase">
                                <Users className="size-3.5" />
                                Members
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-zinc-100">
                                {activeWorkspace.memberCount}
                            </p>
                        </article>

                        <article className="border border-zinc-800 bg-[#090b11] p-4">
                            <p className="inline-flex items-center gap-2 text-xs tracking-wide text-zinc-400 uppercase">
                                <ShieldCheck className="size-3.5" />
                                Access
                            </p>
                            <p className="mt-2 text-sm font-medium text-zinc-100">
                                Role: {activeWorkspace.role}
                            </p>
                            <p className="text-sm text-zinc-400">
                                Scope: {formatAccessScope(activeWorkspace.projectAccessScope)}
                            </p>
                        </article>
                    </section>

                    <section className="border border-zinc-800 bg-[#090b11]">
                        <div className="border-b border-zinc-800 px-4 py-3">
                            <h2 className="text-xl font-semibold text-zinc-100">
                                Projects in {activeWorkspace.name}
                            </h2>
                            <p className="mt-1 text-sm text-zinc-400">
                                {isWorkspaceLoading
                                    ? "Refreshing workspace data..."
                                    : `Workspace slug: ${activeWorkspace.slug}`}
                            </p>
                        </div>

                        <div className="px-4 py-4">
                            {activeWorkspace.projects.length === 0 ? (
                                <p className="border border-zinc-800 bg-zinc-950/40 px-3 py-3 text-sm text-zinc-400">
                                    {activeWorkspace.projectAccessScope ===
                                        "SELECTED_PROJECTS"
                                        ? "No project access granted yet for your member scope."
                                        : "No projects exist yet in this workspace."}
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-180 w-full border-collapse text-left text-sm">
                                        <thead className="text-xs tracking-wide text-zinc-500 uppercase">
                                            <tr className="border-b border-zinc-800">
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
                                                    className="border-b border-zinc-900/80 text-zinc-200"
                                                >
                                                    <td className="py-2 pr-3 font-medium text-zinc-100">
                                                        {project.name}
                                                    </td>
                                                    <td className="py-2 pr-3 text-zinc-400">
                                                        {project.slug}
                                                    </td>
                                                    <td className="py-2 pr-3 text-zinc-400">
                                                        {formatDate(project.createdAt)}
                                                    </td>
                                                    <td className="py-2 pr-3 text-zinc-400">
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

                    <section className="border border-zinc-800 bg-[#090b11]">
                        <div className="border-b border-zinc-800 px-4 py-3">
                            <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-zinc-100">
                                <History className="size-4" />
                                Workspace history
                            </h2>
                        </div>

                        <div className="space-y-2 px-4 py-4">
                            {activeWorkspace.history.length === 0 ? (
                                <p className="text-sm text-zinc-400">
                                    No history entries yet.
                                </p>
                            ) : (
                                activeWorkspace.history.map((entry) => (
                                    <article
                                        key={entry.id}
                                        className="border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                                    >
                                        <p className="text-sm font-medium text-zinc-100">
                                            {entry.message}
                                        </p>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-xs text-zinc-500">
                                                {entry.operation}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {formatDate(entry.createdAt)}
                                            </p>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>
                </>
            ) : null}
        </div>
    );
}
