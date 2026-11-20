import { KeyRound } from "lucide-react";
import type { VaultPanelProps } from "@/types/vault";

export default function VaultPanel({ title, description, children }: VaultPanelProps) {
    return (
        <div className="flex h-full min-h-0 items-start justify-center overflow-y-auto py-6">
            <section className="w-full max-w-xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                    <h1 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
                        <KeyRound className="size-4" />
                        {title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="space-y-4 px-5 py-5">{children}</div>
            </section>
        </div>
    );
}
