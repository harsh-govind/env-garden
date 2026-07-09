import type { AvatarPresetId } from "@/types/avatar";

export const AVATAR_PRESET_IDS = [
    "sprout",
    "ember",
    "cloud",
    "shield",
    "spark",
    "rocket",
    "box",
    "bolt",
    "crown",
    "gem",
    "heart",
    "compass",
    "mountain",
    "droplet",
    "globe",
    "trees",
] as const satisfies readonly AvatarPresetId[];

export const DEFAULT_AVATAR_PRESET_ID: AvatarPresetId = "sprout";

export function isAvatarPresetId(value: string): value is AvatarPresetId {
    return AVATAR_PRESET_IDS.includes(value as AvatarPresetId);
}

export function getRandomAvatarPresetId(): AvatarPresetId {
    const index = Math.floor(Math.random() * AVATAR_PRESET_IDS.length);
    return AVATAR_PRESET_IDS[index] ?? DEFAULT_AVATAR_PRESET_ID;
}
