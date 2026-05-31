import type { AvatarPresetId } from "@/types/avatar";

export type AuthUserRecord = {
    id: string;
    email: string;
    name: string | null;
    avatar: string;
};

export type UserProfileRecord = {
    name: string | null;
    email: string;
    avatar: string;
};

export type CreateUserFromAuthInput = {
    email: string;
    name?: string | null;
};

export type UpdateUserProfileInput = {
    name: string;
    avatar: AvatarPresetId;
};

export type UpdatedUserProfileRecord = {
    name: string | null;
    avatar: string;
};

export type UpdateProfileBody = {
    name?: unknown;
    avatar?: unknown;
};

export type ProfileResponse = {
    name?: string | null;
    email?: string | null;
    avatar?: string;
    error?: string;
};
