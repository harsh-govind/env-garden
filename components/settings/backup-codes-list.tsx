"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/constants/app";
import type { BackupCodesListProps } from "@/types/settings";

export default function BackupCodesList({ codes }: BackupCodesListProps) {
    const [copied, setCopied] = useState(false);
    const text = codes.join("\n");

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
        }
    };

    const download = () => {
        const url = URL.createObjectURL(new Blob([`${APP_NAME} backup codes\n\n${text}\n`], { type: "text/plain" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "env-garden-backup-codes.txt";
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-3 border border-border bg-muted/30 p-3">
            <p className="text-sm text-foreground">
                Save these backup codes somewhere safe. Each one works once if you lose access to your
                authenticator app.
            </p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm sm:grid-cols-3">
                {codes.map((code) => (
                    <li key={code}>{code}</li>
                ))}
            </ul>
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        void copy();
                    }}
                >
                    {copied ? <Check /> : <Copy />}
                    {copied ? "Copied" : "Copy"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={download}>
                    <Download />
                    Download
                </Button>
            </div>
        </div>
    );
}
