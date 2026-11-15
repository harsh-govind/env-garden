"use client";

import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type {
    AuthorizeCliClientProps,
    CliApprovalResponse,
} from "@/types/cli";

export default function AuthorizeCliClient({
    requestId,
    tokenName,
    userEmail,
    isAlreadyApproved,
}: AuthorizeCliClientProps) {
    const [isApproving, setIsApproving] = useState(false);
    const [isApproved, setIsApproved] = useState(isAlreadyApproved);
    const [error, setError] = useState<string | null>(null);

    const approve = async () => {
        setIsApproving(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/cli/v1/auth/requests/${requestId}/approve`,
                { method: "POST" }
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
                    This device will act as {userEmail} and inherit the same workspace,
                    project, and environment access.
                </p>
            </div>

            <Button
                className="w-full"
                disabled={isApproving}
                onClick={() => void approve()}
            >
                {isApproving ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <KeyRound />
                )}
                {isApproving ? "Authorizing..." : "Authorize eit"}
            </Button>

            {error ? (
                <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
