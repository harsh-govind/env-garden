import type { LandingCornerMarkProps, LandingSectionProps } from "@/types/landing";
import { cn } from "@/utils";

function CornerMark({ className }: LandingCornerMarkProps) {
    return (
        <span className={cn("absolute size-2.5 text-foreground/30", className)}>
            <svg viewBox="0 0 10 10" className="size-full" aria-hidden="true">
                <path d="M5 0v10M0 5h10" stroke="currentColor" strokeWidth="1" />
            </svg>
        </span>
    );
}

/** A framed landing section with "+" markers on its top corners. */
export function Section({ id, className, children }: LandingSectionProps) {
    return (
        <section id={id} className={cn("relative scroll-mt-16 border-t", className)}>
            <CornerMark className="-top-[5px] -left-[5px]" />
            <CornerMark className="-top-[5px] -right-[5px]" />
            {children}
        </section>
    );
}
