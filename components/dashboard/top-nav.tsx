"use client";

import { Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardTopNavProps } from "@/types/workspace";

export default function DashboardTopNav({
    workspaces,
    activeWorkspaceId,
    activeWorkspaceName,
    workspaceInitial,
    isCreatingWorkspace,
    onWorkspaceChange,
    onCreateWorkspace,
    onOpenSidebar,
}: DashboardTopNavProps) {
    return (
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-[#06070a]/95 backdrop-blur-sm">
            <div className="flex h-12 items-center gap-2 px-3 sm:px-6">
                <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50 md:hidden"
                    onClick={onOpenSidebar}
                >
                    <Menu />
                </Button>

                <div className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex">
                    <span>Workspaces</span>
                    <span>/</span>
                    <span className="text-zinc-200">{activeWorkspaceName}</span>
                </div>

                <label className="sr-only" htmlFor="workspace-selector">
                    Select workspace
                </label>
                <select
                    id="workspace-selector"
                    value={activeWorkspaceId ?? ""}
                    onChange={(event) => onWorkspaceChange(event.target.value)}
                    className="max-w-48 truncate border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                    disabled={workspaces.length === 0}
                >
                    {workspaces.length === 0 ? (
                        <option value="">No workspaces</option>
                    ) : null}
                    {workspaces.map((workspace) => (
                        <option key={workspace.id} value={workspace.id}>
                            {workspace.name}
                        </option>
                    ))}
                </select>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        className="hidden h-8 min-w-56 items-center gap-2 border border-zinc-800 bg-zinc-950/80 px-2 text-xs text-zinc-500 lg:flex"
                    >
                        <Search className="size-3.5" />
                        <span className="truncate">Search in {activeWorkspaceName}</span>
                    </button>

                    <Button
                        type="button"
                        size="sm"
                        className="border border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900"
                        onClick={onCreateWorkspace}
                        disabled={isCreatingWorkspace}
                    >
                        <Plus />
                        {isCreatingWorkspace ? "Creating..." : "New workspace"}
                    </Button>

                    <button
                        type="button"
                        className="grid size-7 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-200"
                        aria-label="Workspace profile"
                    >
                        {workspaceInitial}
                    </button>
                </div>
            </div>
        </header>
    );
}
