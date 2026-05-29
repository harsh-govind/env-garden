"use client";

import { useCallback, useState } from "react";
import DashboardSidebar from "@/components/dashboard/sidebar";
import DashboardTopNav from "@/components/dashboard/top-nav";
import { useAuthenticated } from "@/contexts/authenticated";
import { WorkspaceProvider, useWorkspace } from "@/contexts/workspace";
import type { AuthenticatedLayoutProps } from "@/types/layouts";

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    return (
        <WorkspaceProvider>
            <AuthenticatedShell>{children}</AuthenticatedShell>
        </WorkspaceProvider>
    );
}

function AuthenticatedShell({ children }: AuthenticatedLayoutProps) {
    const { user } = useAuthenticated();
    const {
        workspaces,
        activeWorkspaceId,
        activeWorkspace,
        isCreatingWorkspace,
        selectWorkspace,
        createWorkspace,
    } = useWorkspace();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const workspaceName = activeWorkspace?.name ?? "No workspace";
    const workspaceInitial = workspaceName.match(/[a-z]/i)?.[0]?.toUpperCase()
        ?? user?.name?.match(/[a-z]/i)?.[0]?.toUpperCase()
        ?? "W";

    const handleCreateWorkspace = useCallback(async () => {
        const name = window.prompt("Workspace name");

        if (!name || !name.trim()) {
            return;
        }

        await createWorkspace({ name: name.trim() });
    }, [createWorkspace]);

    return (
        <div className="min-h-screen bg-[#06070a] text-zinc-200">
            <div className="flex min-h-screen">
                <DashboardSidebar
                    workspaceName={workspaceName}
                    projectCount={activeWorkspace?.projectCount ?? 0}
                    memberCount={activeWorkspace?.memberCount ?? 0}
                    historyCount={activeWorkspace?.history.length ?? 0}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                    <DashboardTopNav
                        workspaces={workspaces}
                        activeWorkspaceId={activeWorkspaceId}
                        activeWorkspaceName={workspaceName}
                        workspaceInitial={workspaceInitial}
                        isCreatingWorkspace={isCreatingWorkspace}
                        onWorkspaceChange={selectWorkspace}
                        onCreateWorkspace={() => {
                            void handleCreateWorkspace();
                        }}
                        onOpenSidebar={() => setIsSidebarOpen((prev) => !prev)}
                    />

                    <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
