"use client";

import { ChevronDown, Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardTopNavProps = {
    breadcrumbs: string[];
    projectName: string;
    workspaceInitial: string;
    onOpenSidebar: () => void;
};

export default function DashboardTopNav({
    breadcrumbs,
    projectName,
    workspaceInitial,
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
                    {breadcrumbs.map((crumb) => (
                        <span key={crumb}>{crumb}</span>
                    ))}
                </div>

                <button
                    type="button"
                    className="flex items-center gap-1.5 border border-transparent px-2 py-1 text-sm font-medium text-zinc-100 hover:border-zinc-800 hover:bg-zinc-900"
                >
                    <span>{projectName}</span>
                    <ChevronDown className="size-3.5 text-zinc-500" />
                </button>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        className="hidden h-8 min-w-56 items-center gap-2 border border-zinc-800 bg-zinc-950/80 px-2 text-xs text-zinc-500 lg:flex"
                    >
                        <Search className="size-3.5" />
                        <span>Search</span>
                        <span className="ml-auto border border-zinc-700 px-1 py-0.5 text-[10px] text-zinc-400">
                            K
                        </span>
                    </button>

                    <Button
                        type="button"
                        size="sm"
                        className="border border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900"
                    >
                        <Plus />
                        New
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