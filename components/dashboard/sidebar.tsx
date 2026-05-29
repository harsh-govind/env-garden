"use client";

import {
    Activity,
    Bell,
    BookOpen,
    CreditCard,
    FolderKanban,
    Globe2,
    History,
    Layers3,
    LifeBuoy,
    Link2,
    Settings,
    UserPlus,
    Webhook,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
    DashboardIconName,
    DashboardSidebarItem,
    DashboardSidebarSection,
} from "@/types/dashboard";

type DashboardSidebarProps = {
    workspaceName: string;
    sections: DashboardSidebarSection[];
    footerItems: DashboardSidebarItem[];
    isOpen: boolean;
    onClose: () => void;
};

const iconMap: Record<DashboardIconName, LucideIcon> = {
    projects: FolderKanban,
    blueprints: BookOpen,
    "environment-groups": Layers3,
    observability: Activity,
    webhooks: Webhook,
    notifications: Bell,
    "private-links": Link2,
    "dedicated-ips": Globe2,
    billing: CreditCard,
    settings: Settings,
    changelog: History,
    invite: UserPlus,
    support: LifeBuoy,
    status: Activity,
};

function SidebarItem({ item }: { item: DashboardSidebarItem }) {
    const Icon = iconMap[item.icon];

    return (
        <button
            type="button"
            className={cn(
                "group flex w-full items-center justify-between gap-2 border border-transparent px-2 py-2 text-left text-sm transition",
                item.active
                    ? "bg-[#28004d] text-zinc-50"
                    : "text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/70 hover:text-zinc-100"
            )}
        >
            <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
            </span>
            {item.badge ? (
                <span className="border border-violet-700/70 bg-violet-700/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-200">
                    {item.badge}
                </span>
            ) : null}
        </button>
    );
}

export default function DashboardSidebar({
    workspaceName,
    sections,
    footerItems,
    isOpen,
    onClose,
}: DashboardSidebarProps) {
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
                        {sections.map((section) => (
                            <div key={section.id} className="mb-4">
                                <p className="px-2 py-2 text-[10px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
                                    {section.title}
                                </p>
                                <div className="space-y-0.5">
                                    {section.items.map((item) => (
                                        <SidebarItem key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-zinc-800 px-2 py-2">
                        <div className="space-y-0.5">
                            {footerItems.map((item) => (
                                <SidebarItem key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}