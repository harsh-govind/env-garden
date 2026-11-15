import type { LandingLabelProps } from "@/types/landing";
import { cn } from "@/utils";

export function Label({ children, className }: LandingLabelProps) {
    return (
        <p className={cn("font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase", className)}>
            {children}
        </p>
    );
}
