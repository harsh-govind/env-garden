"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { NewTokenNoticeProps } from "@/types/service-account";

export default function NewTokenNotice({ accountName, token, onDismiss }: NewTokenNoticeProps) {
    const [hasCopied, setHasCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(token);
            setHasCopied(true);
            window.setTimeout(() => setHasCopied(false), 1600);
        } catch {
            setHasCopied(false);
        }
    };

    return (
        <section className="space-y-3 border border-foreground bg-card px-4 py-4">
            <div>
                <h2 className="text-base font-semibold text-foreground">New token for {accountName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Copy it now. It contains half of the service account&apos;s key and is never shown again.
                    Store it as a secret named <code>EIT_TOKEN</code> in your CI.
                </p>
            </div>
            <code className="block break-all border border-border bg-muted px-3 py-2 font-mono text-xs text-foreground">
                {token}
            </code>
            <pre className="overflow-x-auto border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
                {"EIT_TOKEN=${{ secrets.EIT_TOKEN }} npx @env-garden/cli run -- npm run deploy"}
            </pre>
            <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void copy()}>
                    {hasCopied ? <Check /> : <Copy />}
                    {hasCopied ? "Copied" : "Copy token"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
                    I&apos;ve stored it
                </Button>
            </div>
        </section>
    );
}
