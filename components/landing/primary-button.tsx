import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { LandingPrimaryButtonProps } from "@/types/landing";

export function PrimaryButton({ href, children }: LandingPrimaryButtonProps) {
    return (
        <Link
            href={href}
            className="group inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background shadow-sm transition hover:bg-foreground/85"
        >
            {children}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
    );
}
