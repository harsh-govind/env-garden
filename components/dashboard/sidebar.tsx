"use client";

import {
    FolderKanban,
    History,
    Settings,
    Users,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    canViewHistory,
} from "@/constants/access";
import { matchesRoutePath } from "@/constants/routes";
import { cn } from "@/utils";
import type {
    DashboardSidebarProps,
    SidebarItemData,
} from "@/types/workspace";

function SidebarItem({
    item,
    onSelect,
}: {
    item: SidebarItemData;
    onSelect: () => void;
}) {
    const Icon = item.icon;
    const className = cn(
        "group flex w-full items-center justify-between gap-2 border border-transparent px-2 py-2 text-left text-sm transition",
        item.active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
    );

    const content = (
        <>
            <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
            </span>

            {typeof item.count === "number" ? (
                <span className="border border-border bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {item.count}
                </span>
            ) : null}
        </>
    );

    if (item.href) {
        return (
            <Link href={item.href} className={className} onClick={onSelect}>
                {content}
            </Link>
        );
    }

    return (
        <button
            type="button"
            className={className}
        >
            {content}
        </button>
    );
}

export default function DashboardSidebar({
    activeWorkspaceId,
    projectCount,
    memberCount,
    historyCount,
    workspaceRole,
    isOpen,
    onClose,
}: DashboardSidebarProps) {
    const pathname = usePathname();
    const isHistoryRoute = matchesRoutePath(pathname, "/:workspaceId/history");
    const isMembersRoute = matchesRoutePath(pathname, "/:workspaceId/members");
    const canOpenHistory =
        workspaceRole !== null
            ? canViewHistory(workspaceRole)
            : false;

    const primaryItems: SidebarItemData[] = [
        {
            id: "projects",
            label: "Projects",
            icon: FolderKanban,
            href: "/",
            count: projectCount,
            active: !isHistoryRoute && !isMembersRoute,
        },
        {
            id: "members",
            label: "Members",
            icon: Users,
            href: activeWorkspaceId ? `/${activeWorkspaceId}/members` : undefined,
            count: memberCount,
            active: isMembersRoute,
        },
    ];

    if (canOpenHistory && activeWorkspaceId) {
        primaryItems.push({
            id: "history",
            label: "History",
            icon: History,
            href: `/${activeWorkspaceId}/history`,
            count: historyCount,
            active: isHistoryRoute,
        });
    }

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
                    "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform md:static md:translate-x-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    <div className="flex h-12 items-center justify-between border-b border-border px-3">
                        <Link
                            href="/"
                            className="flex min-w-0 items-center gap-2.5"
                            onClick={onClose}
                            aria-label="Go to env.garden home"
                        >
                            <span className="grid size-7 place-items-center border border-border bg-accent text-xs font-bold tracking-tight text-accent-foreground">
                                eg
                            </span>
                            <span className="truncate text-base leading-none font-extrabold tracking-tight text-foreground">
                                env.garden
                            </span>
                        </Link>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
                            onClick={onClose}
                        >
                            <X />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 py-2">
                        <div className="mb-4">
                            <p className="px-2 py-2 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                                Workspace
                            </p>
                            <div className="space-y-0.5">
                                {primaryItems.map((item) => (
                                    <SidebarItem
                                        key={item.id}
                                        item={item}
                                        onSelect={onClose}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border px-2 py-2">
                        <div className="space-y-0.5">
                            {secondaryItems.map((item) => (
                                <SidebarItem key={item.id} item={item} onSelect={onClose} />
                            ))}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
