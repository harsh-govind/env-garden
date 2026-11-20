import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { VAULT_BROADCAST_CHANNEL } from "@/constants/vault";
import { clearVaultSession } from "@/lib/vault-session";
import type { AppRouter } from "@/types/auth";

export const authClient = createAuthClient({
    plugins: [magicLinkClient(), twoFactorClient()],
});

function broadcastVaultLock() {
    if (typeof BroadcastChannel === "undefined") {
        return;
    }

    const channel = new BroadcastChannel(VAULT_BROADCAST_CHANNEL);
    channel.postMessage("lock");
    channel.close();
}

export async function signOutAndGoHome(router: AppRouter) {
    await clearVaultSession();
    broadcastVaultLock();
    await authClient.signOut();
    router.replace("/");
    router.refresh();
}
