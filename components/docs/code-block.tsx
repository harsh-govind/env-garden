"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DocsCodeBlockProps } from "@/types/docs";

export function CodeBlock({ code, label }: DocsCodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
        }
    };

    return (
        <div className="border border-border bg-card">
            <div className="flex h-9 items-center justify-between border-b border-border px-3">
                <span className="font-mono text-xs text-muted-foreground">{label ?? "terminal"}</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                        void copy();
                    }}
                    aria-label="Copy code"
                >
                    {copied ? <Check /> : <Copy />}
                </Button>
            </div>
            <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-6 text-foreground">
                <code>{code}</code>
            </pre>
        </div>
    );
}
