import Link from "next/link";
import { Label } from "@/components/landing/label";
import type { LandingFooterLinksProps } from "@/types/landing";

export function FooterLinks({ title, links }: LandingFooterLinksProps) {
    return (
        <div className="text-sm">
            <Label>{title}</Label>
            <ul className="mt-4 space-y-2 text-muted-foreground">
                {links.map((link) => (
                    <li key={link.label}>
                        {link.isInternal ? (
                            <Link className="transition hover:text-foreground" href={link.href}>
                                {link.label}
                            </Link>
                        ) : (
                            <a className="transition hover:text-foreground" href={link.href}>
                                {link.label}
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
