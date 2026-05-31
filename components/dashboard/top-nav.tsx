"use client";

import { FolderKanban, LogOut, Menu, Moon, Plus, Sun, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
    AvatarPresetBadge,
    DEFAULT_AVATAR_PRESET_ID,
} from "@/components/avatar/presets";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthenticated } from "@/contexts/authenticated";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { isAvatarPresetId } from "@/lib/avatar-presets";
import type { DashboardTopNavProps } from "@/types/workspace";

export default function DashboardTopNav({
    workspaces,
    activeWorkspaceId,
    activeWorkspaceName,
    isCreatingWorkspace,
    onWorkspaceChange,
    onCreateProject,
    onCreateWorkspace,
    onOpenSidebar,
}: DashboardTopNavProps) {
    const { user } = useAuthenticated();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isProfileMenuOpen) {
            return;
        }

        const handleOutsideClick = (event: MouseEvent) => {
            if (!profileMenuRef.current?.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsProfileMenuOpen(false);
            }
        };

        window.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("keydown", handleEscape);

        return () => {
            window.removeEventListener("mousedown", handleOutsideClick);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isProfileMenuOpen]);

    const activeTheme = theme ?? "system";
    const profileAvatar =
        user?.avatar && isAvatarPresetId(user.avatar)
            ? user.avatar
            : DEFAULT_AVATAR_PRESET_ID;

    return (
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
            <div className="flex h-12 items-center gap-2 px-3 sm:px-6">
                <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
                    onClick={onOpenSidebar}
                >
                    <Menu />
                </Button>

                <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                    <span>Workspaces</span>
                    <span>/</span>
                    <span className="text-foreground">{activeWorkspaceName}</span>
                </div>

                <Select
                    value={activeWorkspaceId ?? ""}
                    onValueChange={onWorkspaceChange}
                    disabled={workspaces.length === 0}
                >
                    <SelectTrigger className="w-48" aria-label="Select workspace">
                        <SelectValue placeholder="No workspaces" />
                    </SelectTrigger>
                    <SelectContent>
                        {workspaces.map((workspace) => (
                            <SelectItem key={workspace.id} value={workspace.id}>
                                {workspace.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="ml-auto flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                size="sm"
                                className="border border-border bg-card text-foreground hover:bg-accent"
                            >
                                <Plus />
                                Add
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Add new</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={onCreateProject}>
                                <FolderKanban className="size-4" />
                                Project
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={onCreateWorkspace}
                                disabled={isCreatingWorkspace}
                            >
                                <Plus className="size-4" />
                                {isCreatingWorkspace ? "Creating workspace..." : "Workspace"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="relative" ref={profileMenuRef}>
                        <button
                            type="button"
                            className="grid size-7 place-items-center rounded-full border border-border bg-card p-0"
                            aria-label="Open profile menu"
                            aria-haspopup="menu"
                            aria-expanded={isProfileMenuOpen}
                            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                        >
                            <AvatarPresetBadge
                                presetId={profileAvatar}
                                size="sm"
                                className="size-7 rounded-full"
                            />
                        </button>

                        {isProfileMenuOpen ? (
                            <div className="absolute right-0 z-30 mt-2 w-60 border border-border bg-popover p-2 text-popover-foreground shadow-xl">
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        router.push("/profile");
                                    }}
                                >
                                    <User className="size-4" />
                                    <span>Profile</span>
                                </button>

                                <button
                                    type="button"
                                    className="mt-1 flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        void signOut({ callbackUrl: "/" });
                                    }}
                                >
                                    <LogOut className="size-4" />
                                    <span>Logout</span>
                                </button>

                                <div className="my-2 h-px bg-border" />

                                <p className="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                    Theme
                                </p>
                                <div className="mt-1 grid grid-cols-3 gap-1">
                                    <button
                                        type="button"
                                        className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-xs ${activeTheme === "dark"
                                            ? "bg-foreground text-background"
                                            : "bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                            }`}
                                        onClick={() => setTheme("dark")}
                                    >
                                        <Moon className="size-3.5" />
                                        Night
                                    </button>
                                    <button
                                        type="button"
                                        className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-xs ${activeTheme === "light"
                                            ? "bg-foreground text-background"
                                            : "bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                            }`}
                                        onClick={() => setTheme("light")}
                                    >
                                        <Sun className="size-3.5" />
                                        Light
                                    </button>
                                    <button
                                        type="button"
                                        className={`px-2 py-1 text-xs ${activeTheme === "system"
                                            ? "bg-foreground text-background"
                                            : "bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                            }`}
                                        onClick={() => setTheme("system")}
                                    >
                                        Auto
                                    </button>
                                </div>

                                <p className="mt-2 truncate px-2 text-[11px] text-muted-foreground">
                                    {user?.email ?? "Signed in"}
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </header>
    );
}
