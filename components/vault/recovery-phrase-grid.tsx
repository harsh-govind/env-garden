"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/constants/app";
import type { RecoveryPhraseGridProps } from "@/types/vault";

export default function RecoveryPhraseGrid({ phrase }: RecoveryPhraseGridProps) {
    const [hasCopied, setHasCopied] = useState(false);
    const words = phrase.split(" ");

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(phrase);
            setHasCopied(true);
            window.setTimeout(() => setHasCopied(false), 1600);
        } catch {
            setHasCopied(false);
        }
    };

    const download = () => {
        const text = `${APP_NAME} recovery phrase\n\n${words
            .map((word, index) => `${String(index + 1).padStart(2, " ")}. ${word}`)
            .join("\n")}\n\nAnyone with these words can read your secrets. Store them offline.\n`;
        const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "env-garden-recovery-phrase.txt";
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-3">
            <ol className="grid grid-cols-2 gap-1.5 border border-border bg-muted/40 p-3 sm:grid-cols-3">
                {words.map((word, index) => (
                    <li key={`${index}-${word}`} className="flex items-baseline gap-2 font-mono text-sm">
                        <span className="w-5 text-right text-xs text-muted-foreground">{index + 1}</span>
                        <span className="text-foreground">{word}</span>
                    </li>
                ))}
            </ol>
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
                    {hasCopied ? <Check /> : <Copy />}
                    {hasCopied ? "Copied" : "Copy"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={download}>
                    <Download />
                    Download
                </Button>
            </div>
        </div>
    );
}
