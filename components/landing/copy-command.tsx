"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CLI_LOGIN_COMMAND } from "@/constants/cli";

export function CopyCommand() {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(CLI_LOGIN_COMMAND);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
                void copy();
            }}
            aria-label="Copy CLI command"
            className="group h-10 gap-3 px-4 font-mono text-[13px] font-normal text-muted-foreground hover:text-foreground"
        >
            <span className="select-none text-foreground/40">$</span>
            {CLI_LOGIN_COMMAND}
            {copied ? (
                <Check className="text-foreground" />
            ) : (
                <Copy className="opacity-40 transition group-hover:opacity-100" />
            )}
        </Button>
    );
}
