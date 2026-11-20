import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { AppRouter } from "@/types/auth";

export const authClient = createAuthClient({
    plugins: [magicLinkClient(), twoFactorClient()],
});

export async function signOutAndGoHome(router: AppRouter) {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
}
