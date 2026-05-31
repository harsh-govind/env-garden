import type { DefaultSession } from "next-auth";
import type { AvatarPresetId } from "@/types/avatar";

declare module "next-auth" {
    interface Session {
        user: DefaultSession["user"] & {
            id: string;
            avatar?: AvatarPresetId;
        };
    }
}
