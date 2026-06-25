"use client";

import { Loader2, LogIn, LogOut, Mail } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthButtonsProps } from "@/types/auth";

function getCallbackUrl() {
    if (typeof window === "undefined") {
        return "/";
    }

    return `${window.location.pathname}${window.location.search}` || "/";
}

export default function AuthButtons({ isAuthenticated }: AuthButtonsProps) {
    const [email, setEmail] = useState("");
    const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (isAuthenticated) {
        return (
            <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                variant="outline"
            >
                <LogOut />
                Sign out
            </Button>
        );
    }

    const requestMagicLink = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSendingMagicLink(true);
        setMessage(null);
        setError(null);

        try {
            const result = await signIn("email", {
                email,
                callbackUrl: getCallbackUrl(),
                redirect: false,
            });

            if (!result || result.error) {
                throw new Error(result?.error ?? "Failed to send magic link.");
            }

            setMessage("Check your email for a magic link.");
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Failed to send magic link."
            );
        } finally {
            setIsSendingMagicLink(false);
        }
    };

    return (
        <div className="w-full max-w-sm space-y-4">
            <form className="space-y-3" onSubmit={requestMagicLink}>
                <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                    Email
                    <input
                        className="mt-1 h-9 w-full border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/50"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                </label>
                <Button
                    className="w-full"
                    type="submit"
                    disabled={isSendingMagicLink}
                >
                    {isSendingMagicLink ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <Mail />
                    )}
                    {isSendingMagicLink ? "Sending..." : "Send magic link"}
                </Button>
            </form>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or</span>
                <span className="h-px flex-1 bg-border" />
            </div>

            <Button
                className="w-full"
                onClick={() => signIn("google", { callbackUrl: getCallbackUrl() })}
                variant="outline"
            >
                <LogIn />
                Continue with Google
            </Button>

            <Button
                className="w-full"
                onClick={() => signIn("github", { callbackUrl: getCallbackUrl() })}
                variant="outline"
            >
                <LogIn />
                Continue with GitHub
            </Button>

            {message ? (
                <p className="border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                    {message}
                </p>
            ) : null}

            {error ? (
                <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
