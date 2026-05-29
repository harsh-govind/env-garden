"use client";

import {
    FolderKanban,
    History,
    LayoutDashboard,
    Settings,
    Users,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
    DashboardSidebarProps,
    SidebarItemData,
} from "@/types/workspace";

function SidebarItem({ item }: { item: SidebarItemData }) {
    const Icon = item.icon;

    return (
        <button
            type="button"
            className={cn(
                "group flex w-full items-center justify-between gap-2 border border-transparent px-2 py-2 text-left text-sm transition",
                item.active
                    ? "bg-[#153356] text-zinc-50"
                    : "text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/70 hover:text-zinc-100"
            )}
        >
            <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
            </span>

            {typeof item.count === "number" ? (
                <span className="border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">
                    {item.count}
                </span>
            ) : null}
        </button>
    );
}

export default function DashboardSidebar({
    workspaceName,
    projectCount,
    memberCount,
    historyCount,
    isOpen,
    onClose,
}: DashboardSidebarProps) {
    const primaryItems: SidebarItemData[] = [
        {
            id: "overview",
            label: "Overview",
            icon: LayoutDashboard,
            active: true,
        },
        {
            id: "projects",
            label: "Projects",
            icon: FolderKanban,
            count: projectCount,
        },
        {
            id: "members",
            label: "Members",
            icon: Users,
            count: memberCount,
        },
        {
            id: "history",
            label: "History",
            icon: History,
            count: historyCount,
        },
    ];

    const secondaryItems: SidebarItemData[] = [
        {
            id: "settings",
            label: "Settings",
            icon: Settings,
        },
    ];

    return (
        <>
            <button
                type="button"
                aria-label="Close sidebar overlay"
                className={cn(
                    "fixed inset-0 z-30 bg-black/70 transition-opacity md:hidden",
                    isOpen ? "opacity-100" : "pointer-events-none opacity-0"
                )}
                onClick={onClose}
            />

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 border-r border-zinc-800 bg-[#0a0b0f] transition-transform md:static md:translate-x-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-3">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="size-2 rounded-full bg-cyan-400" />
                            <span className="truncate text-sm font-medium text-zinc-100">{workspaceName}</span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 md:hidden"
                            onClick={onClose}
                        >
                            <X />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 py-2">
                        <div className="mb-4">
                            <p className="px-2 py-2 text-[10px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
                                Workspace
                            </p>
                            <div className="space-y-0.5">
                                {primaryItems.map((item) => (
                                    <SidebarItem key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-zinc-800 px-2 py-2">
                        <div className="space-y-0.5">
                            {secondaryItems.map((item) => (
                                <SidebarItem key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
