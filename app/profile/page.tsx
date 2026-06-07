"use client";

import { useEffect, useState } from "react";
import { Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    AVATAR_PRESETS,
    AvatarPresetBadge,
    AvatarPresetPicker,
} from "@/components/avatar/presets";
import { Button } from "@/components/ui/button";
import { useAuthenticated } from "@/contexts/authenticated";
import {
    DEFAULT_AVATAR_PRESET_ID,
    isAvatarPresetId,
} from "@/lib/avatar-presets";
import type { AvatarPresetId } from "@/types/avatar";
import type { ProfileResponse } from "@/types/user";

function getAvatarLabel(avatarId: AvatarPresetId) {
    return AVATAR_PRESETS.find((preset) => preset.id === avatarId)?.label ?? "Avatar";
}

export default function ProfilePage() {
    const router = useRouter();
    const { user } = useAuthenticated();
    const [profileName, setProfileName] = useState(user?.name ?? "");
    const [profileEmail, setProfileEmail] = useState(user?.email ?? "");
    const [avatar, setAvatar] = useState<AvatarPresetId>(
        user?.avatar && isAvatarPresetId(user.avatar)
            ? user.avatar
            : DEFAULT_AVATAR_PRESET_ID
    );
    const [draftName, setDraftName] = useState(user?.name ?? "");
    const [draftAvatar, setDraftAvatar] = useState<AvatarPresetId>(avatar);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileNotice, setProfileNotice] = useState<string | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await fetch("/api/profile", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    return;
                }

                const payload = (await response.json().catch(() => null)) as ProfileResponse | null;

                if (!payload) {
                    return;
                }

                if (typeof payload.name === "string") {
                    setProfileName(payload.name);
                    setDraftName(payload.name);
                }

                if (typeof payload.email === "string") {
                    setProfileEmail(payload.email);
                }

                if (
                    typeof payload.avatar === "string"
                    && isAvatarPresetId(payload.avatar)
                ) {
                    setAvatar(payload.avatar);
                    setDraftAvatar(payload.avatar);
                }
            } catch {
                // Ignore profile hydration failures and keep fallback preset.
            }
        };

        void loadProfile();
    }, []);

    const beginEditingProfile = () => {
        setDraftName(profileName);
        setDraftAvatar(avatar);
        setProfileError(null);
        setProfileNotice(null);
        setIsEditingProfile(true);
    };

    const cancelEditingProfile = () => {
        setDraftName(profileName);
        setDraftAvatar(avatar);
        setProfileError(null);
        setProfileNotice(null);
        setIsEditingProfile(false);
    };

    const saveProfile = async () => {
        const normalizedName = draftName.trim();

        if (normalizedName.length < 2 || normalizedName.length > 80) {
            setProfileError("Name must be between 2 and 80 characters.");
            return;
        }

        setProfileError(null);
        setProfileNotice(null);
        setIsSavingProfile(true);

        try {
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: normalizedName,
                    avatar: draftAvatar,
                }),
            });

            const payload = (await response.json().catch(() => null)) as ProfileResponse | null;

            if (!response.ok) {
                throw new Error(
                    payload
                        && typeof payload.error === "string"
                        ? payload.error
                        : "Failed to update profile."
                );
            }

            if (typeof payload?.name === "string") {
                setProfileName(payload.name);
                setDraftName(payload.name);
            } else {
                setProfileName(normalizedName);
                setDraftName(normalizedName);
            }

            if (
                payload
                && typeof payload.avatar === "string"
                && isAvatarPresetId(payload.avatar)
            ) {
                setAvatar(payload.avatar);
                setDraftAvatar(payload.avatar);
            }

            setIsEditingProfile(false);
            setProfileNotice("Profile updated.");
            router.refresh();
        } catch (error) {
            setProfileError(
                error instanceof Error
                    ? error.message
                    : "Failed to update profile."
            );
        } finally {
            setIsSavingProfile(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto">
            <section className="mx-auto max-w-2xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                    <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Account information for your current session.
                    </p>
                </div>

                <div className="space-y-3 px-4 py-4">
                    <div className="border border-border bg-muted/30 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs tracking-wide text-muted-foreground uppercase">Avatar</p>
                                <p className="mt-1 text-sm text-foreground">{getAvatarLabel(avatar)}</p>
                            </div>

                            <AvatarPresetBadge presetId={avatar} size="md" />
                        </div>

                        {isEditingProfile ? (
                            <div className="mt-3">
                                <AvatarPresetPicker
                                    value={draftAvatar}
                                    onChange={(nextAvatar) => {
                                        setDraftAvatar(nextAvatar);
                                    }}
                                />
                            </div>
                        ) : (
                            <p className="mt-3 text-xs text-muted-foreground">
                                Switch to edit mode to change your avatar preset.
                            </p>
                        )}
                    </div>

                    <div className="border border-border bg-muted/30 px-3 py-2">
                        <p className="inline-flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                            <UserRound className="size-3.5" />
                            Name
                        </p>

                        {isEditingProfile ? (
                            <input
                                value={draftName}
                                onChange={(event) => {
                                    setDraftName(event.target.value);
                                }}
                                className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                placeholder="Your name"
                            />
                        ) : (
                            <p className="mt-1 text-sm text-foreground">
                                {profileName || "Not available"}
                            </p>
                        )}
                    </div>

                    <div className="border border-border bg-muted/30 px-3 py-2">
                        <p className="inline-flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                            <Mail className="size-3.5" />
                            Email
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                            {profileEmail || "Not available"}
                        </p>
                    </div>

                    {profileError ? (
                        <p className="text-sm text-red-300">{profileError}</p>
                    ) : null}

                    {profileNotice ? (
                        <p className="text-xs text-emerald-400">{profileNotice}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                        {isEditingProfile ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelEditingProfile}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        void saveProfile();
                                    }}
                                    disabled={isSavingProfile}
                                >
                                    {isSavingProfile ? "Saving..." : "Save profile"}
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={beginEditingProfile}
                            >
                                Edit profile
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            className="border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                                void signOut({ callbackUrl: "/" });
                            }}
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
