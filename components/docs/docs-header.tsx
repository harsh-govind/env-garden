"use client";

import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { Button } from "@/components/ui/button";
import { APP_REPOSITORY_URL } from "@/constants/app";
import { CLI_DOCS_PATH, SIGN_IN_PATH } from "@/constants/routes";
import { useAuthenticated } from "@/contexts/authenticated";

export function DocsHeader() {
    const { isAuthenticated } = useAuthenticated();

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                <div className="flex items-center gap-4">
                    <Link href="/" aria-label="env.garden home">
                        <Logo markClassName="size-6" />
                    </Link>
                    <span className="h-5 w-px bg-border" />
                    <Link href={CLI_DOCS_PATH} className="text-sm font-medium text-foreground">
                        Docs
                    </Link>
                </div>

                <div className="flex items-center gap-1.5">
                    <Button asChild variant="ghost" size="icon">
                        <a href={APP_REPOSITORY_URL} aria-label="GitHub repository">
                            <FaGithub />
                        </a>
                    </Button>
                    <ThemeToggle />
                    <Button asChild size="lg">
                        <Link href={isAuthenticated ? "/" : SIGN_IN_PATH}>
                            {isAuthenticated ? "Open app" : "Sign in"}
                        </Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
