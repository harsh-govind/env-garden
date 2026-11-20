"use client";

import { KeyRound, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import PendingRecipientRow from "@/components/project/pending-recipient-row";
import { Button } from "@/components/ui/button";
import type { KeyAccessBarProps } from "@/types/environment-key";

export default function KeyAccessBar({
    access,
    viewerUserId,
    busyRecipientId,
    isRotating,
    onShare,
    onRotate,
}: KeyAccessBarProps) {
    if (!access || !access.holdsKey) {
        return null;
    }

    const isBusy = isRotating || busyRecipientId !== null;

    return (
        <div className="shrink-0 space-y-2">
            {access.rotationRequired ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-destructive/10 px-3 py-2">
                    <p className="inline-flex items-start gap-2 text-sm text-foreground">
                        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                        Someone lost access to this environment. Rotate its key so they can&apos;t read future
                        changes.
                    </p>
                    {access.canRotate ? (
                        <Button type="button" size="sm" variant="destructive" disabled={isBusy} onClick={onRotate}>
                            {isRotating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                            Rotate key now
                        </Button>
                    ) : (
                        <span className="text-xs text-muted-foreground">
                            A member who can edit this environment must rotate it.
                        </span>
                    )}
                </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <KeyRound className="size-3.5" />
                    Key v{access.version} · held by {access.holderCount}{" "}
                    {access.holderCount === 1 ? "member" : "members"}
                    {access.pendingRecipients.length > 0
                        ? ` · ${access.pendingRecipients.length} waiting`
                        : ""}
                </span>
                {access.canRotate && !access.rotationRequired ? (
                    <Button type="button" variant="ghost" size="xs" disabled={isBusy} onClick={onRotate}>
                        {isRotating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                        Rotate key
                    </Button>
                ) : null}
            </div>

            {access.pendingRecipients.length > 0 ? (
                <ul className="space-y-1.5">
                    {access.pendingRecipients.map((recipient) => (
                        <PendingRecipientRow
                            key={recipient.userId}
                            recipient={recipient}
                            viewerUserId={viewerUserId}
                            isBusy={busyRecipientId === recipient.userId}
                            isDisabled={isBusy}
                            onShare={onShare}
                        />
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
