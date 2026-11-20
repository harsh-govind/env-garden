"use client";

import { AlertTriangle, Loader2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { computeFingerprint } from "@/lib/crypto/keyring";
import { getKeyTrust } from "@/lib/key-pins";
import type { PendingRecipientRowProps } from "@/types/environment-key";
import type { KeyTrust } from "@/types/vault";

export default function PendingRecipientRow({
    recipient,
    viewerUserId,
    isBusy,
    isDisabled,
    onShare,
}: PendingRecipientRowProps) {
    const [fingerprint, setFingerprint] = useState<string | null>(null);
    const [trust] = useState<KeyTrust>(() => getKeyTrust(viewerUserId, recipient.userId, recipient));
    const [isConfirmingChange, setIsConfirmingChange] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        void computeFingerprint(recipient).then((value) => {
            if (isCurrent) {
                setFingerprint(value);
            }
        });

        return () => {
            isCurrent = false;
        };
    }, [recipient]);

    return (
        <li className="flex flex-wrap items-center justify-between gap-3 border border-border bg-background px-3 py-2">
            <div className="min-w-0">
                <p className="truncate text-sm text-foreground">
                    {recipient.name ? `${recipient.name} · ` : ""}
                    {recipient.email}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                    {fingerprint ?? "…"}
                    {trust === "pinned" ? " · seen before" : trust === "new" ? " · first time" : null}
                </p>
                {trust === "changed" ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="size-3" />
                        This member&apos;s key changed. Confirm the fingerprint with them before sharing.
                    </p>
                ) : null}
            </div>
            {trust === "changed" && !isConfirmingChange ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDisabled}
                    onClick={() => setIsConfirmingChange(true)}
                >
                    Review key change
                </Button>
            ) : (
                <Button
                    type="button"
                    size="sm"
                    variant={trust === "changed" ? "destructive" : "default"}
                    disabled={isDisabled}
                    onClick={() => onShare(recipient)}
                >
                    {isBusy ? <Loader2 className="animate-spin" /> : <Share2 />}
                    {trust === "changed" ? "Fingerprint verified, share" : "Share key"}
                </Button>
            )}
        </li>
    );
}
