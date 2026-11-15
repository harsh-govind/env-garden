import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { AppRouter } from "@/types/auth";

export const authClient = createAuthClient({
    plugins: [magicLinkClient(), twoFactorClient()],
});

/** Ends the current session, then re-renders the app as signed out. */
export async function signOutAndGoHome(router: AppRouter) {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
}
