"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/sidebar";
import DashboardTopNav from "@/components/dashboard/top-nav";
import { useAuthenticated } from "@/contexts/authenticated";
import { matchesRoutePath } from "@/lib/constants";
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
    const pathname = usePathname();
    const router = useRouter();
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

    const handleWorkspaceChange = useCallback((workspaceId: string) => {
        selectWorkspace(workspaceId);

        if (matchesRoutePath(pathname, "/:workspaceId/history")) {
            router.replace(`/${workspaceId}/history`);
        }
    }, [pathname, router, selectWorkspace]);

    return (
        <div className="min-h-screen bg-[#06070a] text-zinc-200">
            <div className="flex min-h-screen">
                <DashboardSidebar
                    activeWorkspaceId={activeWorkspaceId}
                    workspaceName={workspaceName}
                    projectCount={activeWorkspace?.projectCount ?? 0}
                    memberCount={activeWorkspace?.memberCount ?? 0}
                    historyCount={activeWorkspace?.historyCount ?? 0}
                    workspaceRole={activeWorkspace?.role ?? null}
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
                        onWorkspaceChange={handleWorkspaceChange}
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
