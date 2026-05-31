import type { LucideIcon } from "lucide-react";

export type AvatarPresetId =
    | "sprout"
    | "ember"
    | "cloud"
    | "shield"
    | "spark"
    | "rocket"
    | "box"
    | "bolt"
    | "crown"
    | "gem"
    | "heart"
    | "compass"
    | "mountain"
    | "droplet"
    | "globe"
    | "trees";

export type AvatarPreset = {
    id: AvatarPresetId;
    label: string;
    icon: LucideIcon;
    toneClassName: string;
};

export type AvatarPresetBadgeProps = {
    presetId: AvatarPresetId;
    size?: "sm" | "md" | "lg";
    className?: string;
};

export type AvatarPresetPickerProps = {
    value: AvatarPresetId;
    onChange: (nextPresetId: AvatarPresetId) => void;
    className?: string;
};
