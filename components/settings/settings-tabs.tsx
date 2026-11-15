"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_TABS } from "@/constants/settings";
import { cn } from "@/utils";

export default function SettingsTabs() {
    const pathname = usePathname();

    return (
        <nav aria-label="Settings" className="flex border-b border-border">
            {SETTINGS_TABS.map((tab) => {
                const isActive = pathname === tab.href;

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                            "-mb-px border-b-2 px-4 py-2 text-sm transition",
                            isActive
                                ? "border-foreground font-medium text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
