import type { DefaultSession } from "next-auth";
import type { AvatarPresetId } from "@/types/avatar";

declare module "next-auth" {
    interface User {
        avatar?: AvatarPresetId;
    }

    interface Session {
        sessionId?: string;
        user: DefaultSession["user"] & {
            id: string;
            avatar?: AvatarPresetId;
        };
    }
}
