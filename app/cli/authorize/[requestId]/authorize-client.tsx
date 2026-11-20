"use client";

import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import VaultSetup from "@/components/vault/vault-setup";
import VaultUnlock from "@/components/vault/vault-unlock";
import { Button } from "@/components/ui/button";
import { useVault } from "@/contexts/vault";
import {
    computeVerificationCode,
    sealCliPackage,
    splitAccountKeyForCli,
} from "@/lib/crypto/cli";
import { loadSodium } from "@/lib/crypto/sodium";
import type {
    AuthorizeCliClientProps,
    CliApprovalResponse,
} from "@/types/cli";

export default function AuthorizeCliClient({
    requestId,
    tokenName,
    tokenHash,
    transportPublicKey,
    userEmail,
    isAlreadyApproved,
}: AuthorizeCliClientProps) {
    const { status, keys } = useVault();
    const [verificationCode, setVerificationCode] = useState<string | null>(null);
    const [isApproving, setIsApproving] = useState(false);
    const [isApproved, setIsApproved] = useState(isAlreadyApproved);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isCurrent = true;

        void computeVerificationCode(transportPublicKey)
            .then((code) => {
                if (isCurrent) {
                    setVerificationCode(code);
                }
            })
            .catch(() => {
                if (isCurrent) {
                    setError("This login request is malformed. Run eit login again.");
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [transportPublicKey]);

    const approve = async () => {
        if (!keys) {
            return;
        }

        setIsApproving(true);
        setError(null);
        const sodium = await loadSodium();
        let shares: Awaited<ReturnType<typeof splitAccountKeyForCli>> | null = null;

        try {
            shares = await splitAccountKeyForCli({ keys, tokenHash });
            const sealedPackage = await sealCliPackage({
                clientShare: shares.clientShare,
                wrapKey: shares.wrapKey,
                transportPublicKey,
            });
            const response = await fetch(
                `/api/cli/v1/auth/requests/${requestId}/approve`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        encryptedServerShare: shares.encryptedServerShare,
                        sealedPackage,
                    }),
                }
            );
            const payload = (await response.json().catch(() => null)) as
                | CliApprovalResponse
                | null;

            if (!response.ok) {
                throw new Error(payload?.error || "Failed to authorize the CLI.");
            }

            setIsApproved(true);
        } catch (approvalError) {
            setError(
                approvalError instanceof Error
                    ? approvalError.message
                    : "Failed to authorize the CLI."
            );
        } finally {
            if (shares) {
                sodium.memzero(shares.clientShare);
                sodium.memzero(shares.wrapKey);
            }

            setIsApproving(false);
        }
    };

    if (isApproved) {
        return (
            <div className="border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="size-4" />
                    CLI authorized
                </div>
                <p className="mt-2 text-sm">
                    You can close this window and return to your terminal.
                </p>
            </div>
        );
    }

    if (status === "loading") {
        return (
            <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
            </div>
        );
    }

    if (status === "missing") {
        return (
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    Set up end-to-end encryption first. The CLI uses the same keys.
                </p>
                <VaultSetup mode="setup" />
            </div>
        );
    }

    if (status !== "unlocked") {
        return (
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    Unlock your vault so this browser can hand your keys to the CLI.
                </p>
                <VaultUnlock />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    Device
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                    {tokenName}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                    This device will act as {userEmail}, inherit the same access, and be able to decrypt
                    the environments you hold keys for.
                </p>
            </div>

            <div className="border border-border px-4 py-3">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    Verification code
                </p>
                <p className="mt-1 font-mono text-2xl tracking-widest text-foreground">
                    {verificationCode ?? "…"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Only authorize if your terminal shows the same code.
                </p>
            </div>

            <Button
                className="w-full"
                disabled={isApproving || !verificationCode}
                onClick={() => void approve()}
            >
                {isApproving ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <KeyRound />
                )}
                {isApproving ? "Authorizing..." : "Codes match, authorize eit"}
            </Button>

            {error ? (
                <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
