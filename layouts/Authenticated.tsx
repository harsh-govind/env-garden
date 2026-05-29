"use client";

import { useMemo, useState } from "react";
import DashboardSidebar from "@/components/dashboard/sidebar";
import DashboardTopNav from "@/components/dashboard/top-nav";
import { useAuthenticated } from "@/contexts/authenticated-context";
import { getDashboardData } from "@/lib/dashboard-data";
import type { AuthenticatedLayoutProps } from "@/types/layouts";

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    const { user } = useAuthenticated();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const dashboardData = useMemo(() => getDashboardData(user?.name), [user?.name]);

    return (
        <div className="min-h-screen bg-[#06070a] text-zinc-200">
            <div className="flex min-h-screen">
                <DashboardSidebar
                    workspaceName={dashboardData.shell.workspaceName}
                    sections={dashboardData.shell.sidebarSections}
                    footerItems={dashboardData.shell.sidebarFooter}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                    <DashboardTopNav
                        breadcrumbs={dashboardData.shell.breadcrumbs}
                        projectName={dashboardData.shell.projectName}
                        workspaceInitial={dashboardData.shell.workspaceInitial}
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
