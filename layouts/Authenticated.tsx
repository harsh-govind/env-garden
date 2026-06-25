"use client";

import { useCallback, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/sidebar";
import DashboardTopNav from "@/components/dashboard/top-nav";
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
    defaultProjectEnvironmentTypes,
    environmentTypes,
    matchesRoutePath,
} from "@/lib/constants";
import { WorkspaceProvider, useWorkspace } from "@/contexts/workspace";
import type { AuthenticatedLayoutProps } from "@/types/layouts";
import type { EnvironmentTypeValue } from "@/types/workspace";

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    return (
        <WorkspaceProvider>
            <AuthenticatedShell>{children}</AuthenticatedShell>
        </WorkspaceProvider>
    );
}

function AuthenticatedShell({ children }: AuthenticatedLayoutProps) {
    const {
        workspaces,
        activeWorkspaceId,
        activeWorkspace,
        isLoading,
        isWorkspaceLoading,
        isCreatingWorkspace,
        selectWorkspace,
        createWorkspace,
        createProject,
        isCreatingProject,
    } = useWorkspace();
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createTarget, setCreateTarget] = useState<"project" | "workspace">("workspace");
    const [workspaceNameInput, setWorkspaceNameInput] = useState("");
    const [workspaceDescriptionInput, setWorkspaceDescriptionInput] = useState("");
    const [createDialogError, setCreateDialogError] = useState<string | null>(null);
    const [projectNameInput, setProjectNameInput] = useState("");
    const [projectDescriptionInput, setProjectDescriptionInput] = useState("");
    const [projectEnvironmentsInput, setProjectEnvironmentsInput] = useState<EnvironmentTypeValue[]>(
        [...defaultProjectEnvironmentTypes]
    );

    const workspaceName = activeWorkspace?.name ?? "No workspace";

    const handleCreateDialogOpenChange = useCallback((isOpen: boolean) => {
        setIsCreateDialogOpen(isOpen);

        if (!isOpen) {
            setCreateDialogError(null);
        }
    }, []);

    const handleOpenCreateWorkspaceDialog = useCallback(() => {
        setCreateTarget("workspace");
        setCreateDialogError(null);
        setIsCreateDialogOpen(true);
    }, []);

    const handleOpenCreateProjectDialog = useCallback(() => {
        setCreateTarget("project");
        setCreateDialogError(null);
        setProjectEnvironmentsInput([...defaultProjectEnvironmentTypes]);
        setIsCreateDialogOpen(true);
    }, []);

    const handleProjectEnvironmentToggle = useCallback(
        (environment: EnvironmentTypeValue, isChecked: boolean) => {
            setProjectEnvironmentsInput((currentEnvironments) => {
                if (isChecked) {
                    return currentEnvironments.includes(environment)
                        ? currentEnvironments
                        : [...currentEnvironments, environment];
                }

                return currentEnvironments.filter(
                    (currentEnvironment) => currentEnvironment !== environment
                );
            });
        },
        []
    );

    const handleCreateWorkspaceSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const name = workspaceNameInput.trim();
        const description = workspaceDescriptionInput.trim();

        if (name.length < 2) {
            setCreateDialogError("Workspace name must be at least 2 characters.");
            return;
        }

        if (name.length > 80) {
            setCreateDialogError("Workspace name must be 80 characters or less.");
            return;
        }

        if (description.length > 280) {
            setCreateDialogError("Workspace description must be 280 characters or less.");
            return;
        }

        try {
            await createWorkspace({
                name,
                description: description || undefined,
            });
            setWorkspaceNameInput("");
            setWorkspaceDescriptionInput("");
            setCreateDialogError(null);
            setIsCreateDialogOpen(false);
        } catch (createError) {
            setCreateDialogError(
                createError instanceof Error
                    ? createError.message
                    : "Failed to create workspace."
            );
        }
    }, [createWorkspace, workspaceDescriptionInput, workspaceNameInput]);

    const handleCreateProjectSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const name = projectNameInput.trim();
        const description = projectDescriptionInput.trim();

        if (!activeWorkspaceId) {
            setCreateDialogError("No active workspace selected.");
            return;
        }

        if (name.length < 2) {
            setCreateDialogError("Project name must be at least 2 characters.");
            return;
        }

        if (name.length > 80) {
            setCreateDialogError("Project name must be 80 characters or less.");
            return;
        }

        if (description.length > 280) {
            setCreateDialogError("Project description must be 280 characters or less.");
            return;
        }

        if (projectEnvironmentsInput.length === 0) {
            setCreateDialogError("Select at least one project environment.");
            return;
        }

        try {
            if (!createProject) {
                throw new Error("Project creation is not available.");
            }

            await createProject({
                workspaceId: activeWorkspaceId,
                name,
                description: description || undefined,
                environments: projectEnvironmentsInput,
            });

            setProjectNameInput("");
            setProjectDescriptionInput("");
            setProjectEnvironmentsInput([...defaultProjectEnvironmentTypes]);
            setCreateDialogError(null);
            setIsCreateDialogOpen(false);
        } catch (createError) {
            setCreateDialogError(
                createError instanceof Error ? createError.message : "Failed to create project."
            );
        }
    }, [
        activeWorkspaceId,
        createProject,
        projectDescriptionInput,
        projectEnvironmentsInput,
        projectNameInput,
    ]);

    const handleWorkspaceChange = useCallback((workspaceId: string) => {
        selectWorkspace(workspaceId);

        if (matchesRoutePath(pathname, "/:workspaceId/history")) {
            router.replace(`/${workspaceId}/history`);
        } else if (matchesRoutePath(pathname, "/:workspaceId/members")) {
            router.replace(`/${workspaceId}/members`);
        } else if (matchesRoutePath(pathname, "/:workspaceId/projects/:projectId")) {
            router.replace("/");
        }
    }, [pathname, router, selectWorkspace]);

    const showFullPageLoading =
        isLoading ||
        (Boolean(activeWorkspaceId) && isWorkspaceLoading && !activeWorkspace);

    if (showFullPageLoading) {
        return (
            <div className="grid h-dvh place-items-center overflow-hidden bg-background text-foreground">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
                    <p className="text-sm text-muted-foreground">Loading workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-dvh overflow-hidden bg-background text-foreground">
            <div className="flex h-full min-h-0">
                <DashboardSidebar
                    activeWorkspaceId={activeWorkspaceId}
                    projectCount={activeWorkspace?.projectCount ?? 0}
                    memberCount={activeWorkspace?.memberCount ?? 0}
                    historyCount={activeWorkspace?.historyCount ?? 0}
                    workspaceRole={activeWorkspace?.role ?? null}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <DashboardTopNav
                        workspaces={workspaces}
                        activeWorkspaceId={activeWorkspaceId}
                        activeWorkspaceName={workspaceName}
                        isCreatingWorkspace={isCreatingWorkspace}
                        isCreatingProject={isCreatingProject}
                        onWorkspaceChange={handleWorkspaceChange}
                        onCreateProject={handleOpenCreateProjectDialog}
                        onCreateWorkspace={handleOpenCreateWorkspaceDialog}
                        onOpenSidebar={() => setIsSidebarOpen((prev) => !prev)}
                    />

                    <main className="min-h-0 flex-1 overflow-hidden px-4 py-6 sm:px-8">
                        {children}
                    </main>

                    <Dialog
                        open={isCreateDialogOpen}
                        onOpenChange={handleCreateDialogOpenChange}
                    >
                        <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-md">
                            {createTarget === "workspace" ? (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>Add workspace</DialogTitle>
                                        <DialogDescription>
                                            Create a workspace for projects, members, and environment access.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form
                                        className="space-y-3"
                                        onSubmit={(event) => {
                                            void handleCreateWorkspaceSubmit(event);
                                        }}
                                    >
                                        <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                            Workspace name
                                            <input
                                                value={workspaceNameInput}
                                                onChange={(event) => {
                                                    setWorkspaceNameInput(event.target.value);
                                                }}
                                                placeholder="Acme Platform"
                                                className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                                required
                                            />
                                        </label>

                                        <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                            Description (optional)
                                            <textarea
                                                value={workspaceDescriptionInput}
                                                onChange={(event) => {
                                                    setWorkspaceDescriptionInput(event.target.value);
                                                }}
                                                placeholder="Workspace for platform environments"
                                                className="mt-2 h-20 w-full resize-none border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                            />
                                        </label>

                                        {createDialogError ? (
                                            <p className="text-sm text-red-300">{createDialogError}</p>
                                        ) : null}

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsCreateDialogOpen(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={isCreatingWorkspace}>
                                                {isCreatingWorkspace ? "Creating workspace..." : "Create workspace"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </>
                            ) : (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>Add project</DialogTitle>
                                        <DialogDescription>
                                            {activeWorkspaceId
                                                ? `Create a new project in ${activeWorkspace?.name}.`
                                                : "Create or select a workspace first before adding a project."}
                                        </DialogDescription>
                                    </DialogHeader>

                                    {activeWorkspaceId ? (
                                        <form
                                            className="space-y-3"
                                            onSubmit={(event) => {
                                                void handleCreateProjectSubmit(event);
                                            }}
                                        >
                                            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                                Project name
                                                <input
                                                    value={projectNameInput}
                                                    onChange={(event) => {
                                                        setProjectNameInput(event.target.value);
                                                    }}
                                                    placeholder="My Project"
                                                    className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                                    required
                                                />
                                            </label>

                                            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                                Description (optional)
                                                <textarea
                                                    value={projectDescriptionInput}
                                                    onChange={(event) => {
                                                        setProjectDescriptionInput(event.target.value);
                                                    }}
                                                    placeholder="A short description"
                                                    className="mt-2 h-20 w-full resize-none border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                                />
                                            </label>

                                            <fieldset className="space-y-2">
                                                <legend className="text-xs tracking-wide text-muted-foreground uppercase">
                                                    Environment files
                                                </legend>
                                                <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto border border-border bg-background p-2 sm:grid-cols-2">
                                                    {environmentTypes.map((environmentType) => {
                                                        const isChecked = projectEnvironmentsInput.includes(
                                                            environmentType.key
                                                        );

                                                        return (
                                                            <label
                                                                key={environmentType.key}
                                                                className="flex min-h-9 items-center gap-2 border border-border bg-card px-2 py-1.5 text-sm text-foreground"
                                                                title={environmentType.shortDescription}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={(event) => {
                                                                        handleProjectEnvironmentToggle(
                                                                            environmentType.key,
                                                                            event.target.checked
                                                                        );
                                                                    }}
                                                                    className="size-4 shrink-0"
                                                                    style={{
                                                                        accentColor: environmentType.color,
                                                                    }}
                                                                />
                                                                <span
                                                                    className="size-2 shrink-0"
                                                                    style={{
                                                                        backgroundColor: environmentType.color,
                                                                    }}
                                                                    aria-hidden="true"
                                                                />
                                                                <span className="min-w-0 truncate">
                                                                    {environmentType.label}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </fieldset>

                                            {createDialogError ? (
                                                <p className="text-sm text-red-300">{createDialogError}</p>
                                            ) : null}

                                            <DialogFooter>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setIsCreateDialogOpen(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button type="submit" disabled={isCreatingProject}>
                                                    {isCreatingProject ? "Creating project..." : "Create project"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    ) : (
                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsCreateDialogOpen(false)}
                                            >
                                                Close
                                            </Button>
                                        </DialogFooter>
                                    )}
                                </>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
