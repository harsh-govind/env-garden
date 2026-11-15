import type { LogoMarkProps, LogoProps } from "@/types/brand";
import { cn } from "@/utils";

/**
 * env.garden mark: ".E" — a dot followed by an E whose three bars
 * read like lines in a .env file. Monochrome; follows the theme.
 */
export function LogoMark({ className }: LogoMarkProps) {
    return (
        <svg
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className={cn("size-7 shrink-0", className)}
        >
            <rect width="32" height="32" rx="8" className="fill-foreground" />
            <g className="fill-background">
                <circle cx="8.75" cy="22" r="2" />
                <rect x="13" y="8.5" width="3" height="15" rx="1" />
                <rect x="13" y="8.5" width="11.5" height="3" rx="1.5" />
                <rect x="13" y="14.5" width="8" height="3" rx="1.5" />
                <rect x="13" y="20.5" width="11.5" height="3" rx="1.5" />
            </g>
        </svg>
    );
}

export function Logo({ className, markClassName, wordmarkClassName }: LogoProps) {
    return (
        <span className={cn("inline-flex items-center gap-2", className)}>
            <LogoMark className={markClassName} />
            <span className={cn("text-sm font-semibold tracking-tight", wordmarkClassName)}>
                env<span className="text-muted-foreground">.</span>garden
            </span>
        </span>
    );
}
