"use client";

import { Loader2 } from "lucide-react";
import VaultPanel from "@/components/vault/vault-panel";
import VaultSetup from "@/components/vault/vault-setup";
import VaultUnlock from "@/components/vault/vault-unlock";
import { Button } from "@/components/ui/button";
import { useVault } from "@/contexts/vault";
import type { VaultGateProps } from "@/types/vault";

export default function VaultGate({ children }: VaultGateProps) {
    const { status, error, reload } = useVault();

    if (status === "unlocked") {
        return <>{children}</>;
    }

    if (status === "loading") {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
            </div>
        );
    }

    if (status === "error") {
        return (
            <VaultPanel title="Couldn't load your keys" description={error ?? "Try again in a moment."}>
                <Button type="button" size="lg" onClick={() => void reload()}>
                    Try again
                </Button>
            </VaultPanel>
        );
    }

    if (status === "missing") {
        return (
            <VaultPanel
                title="Set up end-to-end encryption"
                description="Create the keys that encrypt your secrets on this device."
            >
                <VaultSetup mode="setup" />
            </VaultPanel>
        );
    }

    return (
        <VaultPanel
            title="Unlock your vault"
            description="Enter your vault passphrase to decrypt your secrets in this browser."
        >
            <VaultUnlock />
        </VaultPanel>
    );
}
