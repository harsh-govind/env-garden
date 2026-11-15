import { Lock } from "lucide-react";
import {
    LANDING_ACCESS_SAMPLE,
    LANDING_CIPHER_SAMPLE,
    LANDING_HISTORY_SAMPLE,
} from "@/constants/landing";
import type { LandingFeatureVisualProps } from "@/types/landing";

function CipherVisual() {
    return (
        <div className="space-y-2 font-mono text-[11px] leading-5">
            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                <span>{LANDING_CIPHER_SAMPLE.key}</span>
                <Lock className="size-3 text-muted-foreground" />
            </div>
            <div className="rounded-md border border-dashed px-3 py-2 break-all text-muted-foreground">
                {LANDING_CIPHER_SAMPLE.ciphertext}
            </div>
        </div>
    );
}

function AccessVisual() {
    return (
        <ul className="divide-y rounded-md border bg-background text-xs">
            {LANDING_ACCESS_SAMPLE.map(({ term: email, detail: role }) => (
                <li key={email} className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">{email}</span>
                    <span className="rounded border px-1.5 py-0.5 font-mono text-[10px]">{role}</span>
                </li>
            ))}
        </ul>
    );
}

function HistoryVisual() {
    return (
        <ol className="relative space-y-3 border-l pl-4 text-xs">
            {LANDING_HISTORY_SAMPLE.map((entry) => (
                <li key={entry.key} className="relative">
                    <span className="absolute top-1.5 -left-[19.5px] size-1.5 rounded-full bg-foreground" />
                    <span className="text-muted-foreground">{entry.action} </span>
                    <span className="font-mono">{entry.key}</span>
                    <span className="float-right text-muted-foreground">{entry.when}</span>
                </li>
            ))}
        </ol>
    );
}

export function FeatureVisual({ visual }: LandingFeatureVisualProps) {
    if (visual === "cipher") {
        return <CipherVisual />;
    }

    if (visual === "access") {
        return <AccessVisual />;
    }

    return <HistoryVisual />;
}
