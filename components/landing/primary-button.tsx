import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LandingPrimaryButtonProps } from "@/types/landing";

export function PrimaryButton({ href, children }: LandingPrimaryButtonProps) {
    return (
        <Button asChild size="lg" className="group h-10 px-4 text-sm">
            <Link href={href}>
                {children}
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
        </Button>
    );
}
