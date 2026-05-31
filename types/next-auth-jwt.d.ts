import type { AvatarPresetId } from "@/types/avatar";

declare module "next-auth/jwt" {
    interface JWT {
        avatar?: AvatarPresetId;
    }
}
