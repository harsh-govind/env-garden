"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { CLI_LOGIN_COMMAND } from "@/constants/cli";

export function CopyCommand() {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(CLI_LOGIN_COMMAND);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            // Clipboard may be unavailable; nothing to do.
        }
    };

    return (
        <button
            type="button"
            onClick={copy}
            aria-label="Copy CLI command"
            className="group inline-flex h-10 items-center gap-3 rounded-md border bg-background px-4 font-mono text-[13px] text-muted-foreground transition hover:text-foreground"
        >
            <span className="select-none text-foreground/40">$</span>
            {CLI_LOGIN_COMMAND}
            {copied ? (
                <Check className="size-3.5 text-foreground" />
            ) : (
                <Copy className="size-3.5 opacity-40 transition group-hover:opacity-100" />
            )}
        </button>
    );
}
