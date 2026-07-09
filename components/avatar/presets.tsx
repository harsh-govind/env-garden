"use client";

import {
    Bolt,
    Box,
    Compass,
    Cloud,
    Crown,
    Droplets,
    Flame,
    Gem,
    Globe,
    Heart,
    Leaf,
    Mountain,
    Rocket,
    Shield,
    Sparkles,
    Trees,
} from "lucide-react";
import {
    type AvatarPreset,
    type AvatarPresetBadgeProps,
    type AvatarPresetId,
    type AvatarPresetPickerProps,
} from "@/types/avatar";
import { cn } from "@/utils";

export { DEFAULT_AVATAR_PRESET_ID } from "@/constants/avatar-presets";

export const AVATAR_PRESETS: AvatarPreset[] = [
    {
        id: "sprout",
        label: "Sprout",
        icon: Leaf,
        toneClassName: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    },
    {
        id: "ember",
        label: "Ember",
        icon: Flame,
        toneClassName: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    },
    {
        id: "cloud",
        label: "Cloud",
        icon: Cloud,
        toneClassName: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    },
    {
        id: "shield",
        label: "Shield",
        icon: Shield,
        toneClassName: "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
    },
    {
        id: "spark",
        label: "Spark",
        icon: Sparkles,
        toneClassName: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    },
    {
        id: "rocket",
        label: "Rocket",
        icon: Rocket,
        toneClassName: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
    },
    {
        id: "box",
        label: "Box",
        icon: Box,
        toneClassName: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
    },
    {
        id: "bolt",
        label: "Bolt",
        icon: Bolt,
        toneClassName: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    },
    {
        id: "crown",
        label: "Crown",
        icon: Crown,
        toneClassName: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
    },
    {
        id: "gem",
        label: "Gem",
        icon: Gem,
        toneClassName: "bg-violet-500/15 text-violet-300 border-violet-500/40",
    },
    {
        id: "heart",
        label: "Heart",
        icon: Heart,
        toneClassName: "bg-pink-500/15 text-pink-300 border-pink-500/40",
    },
    {
        id: "compass",
        label: "Compass",
        icon: Compass,
        toneClassName: "bg-blue-500/15 text-blue-300 border-blue-500/40",
    },
    {
        id: "mountain",
        label: "Mountain",
        icon: Mountain,
        toneClassName: "bg-slate-500/15 text-slate-300 border-slate-500/40",
    },
    {
        id: "droplet",
        label: "Droplet",
        icon: Droplets,
        toneClassName: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
    },
    {
        id: "globe",
        label: "Globe",
        icon: Globe,
        toneClassName: "bg-teal-500/15 text-teal-300 border-teal-500/40",
    },
    {
        id: "trees",
        label: "Trees",
        icon: Trees,
        toneClassName: "bg-lime-500/15 text-lime-300 border-lime-500/40",
    },
];

function findAvatarPreset(id: AvatarPresetId) {
    return AVATAR_PRESETS.find((preset) => preset.id === id) ?? AVATAR_PRESETS[0];
}

const badgeSizeClassNames: Record<NonNullable<AvatarPresetBadgeProps["size"]>, string> = {
    sm: "size-7",
    md: "size-9",
    lg: "size-11",
};

export function AvatarPresetBadge({
    presetId,
    size = "md",
    className,
}: AvatarPresetBadgeProps) {
    const preset = findAvatarPreset(presetId);
    const Icon = preset.icon;

    return (
        <span
            className={cn(
                "grid place-items-center border",
                badgeSizeClassNames[size],
                preset.toneClassName,
                className
            )}
            aria-label={preset.label}
            title={preset.label}
        >
            <Icon className="size-4" />
        </span>
    );
}

export function AvatarPresetPicker({
    value,
    onChange,
    className,
}: AvatarPresetPickerProps) {
    return (
        <div className={cn("grid grid-cols-4 gap-2", className)}>
            {AVATAR_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = preset.id === value;

                return (
                    <button
                        key={preset.id}
                        type="button"
                        className={cn(
                            "grid place-items-center border p-2 transition",
                            isSelected
                                ? "border-foreground bg-accent text-accent-foreground"
                                : "border-border hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => onChange(preset.id)}
                        aria-label={preset.label}
                        aria-pressed={isSelected}
                        title={preset.label}
                    >
                        <span
                            className={cn(
                                "grid size-8 place-items-center border",
                                preset.toneClassName
                            )}
                        >
                            <Icon className="size-4" />
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
