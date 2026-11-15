"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import AuthButtons from "@/components/auth/auth-buttons";
import { LogoMark } from "@/components/brand/logo";
import { useAuthenticated } from "@/contexts/authenticated";

const authErrorMessages: Record<string, string> = {
    OAuthAccountNotLinked:
        "This email is already linked to another sign-in method. Use the method you signed up with.",
    AccessDenied: "Access was denied. Make sure your account has a verified email address.",
    Verification: "This sign-in link is invalid or has expired. Request a new one.",
    EmailSignin: "We couldn't send the sign-in email. Try again in a moment.",
    SessionRequired: "Please sign in to continue.",
};

const DEFAULT_AUTH_ERROR = "Something went wrong while signing in. Please try again.";

// Only allow same-origin relative paths as post-login destinations.
function getSafeCallbackUrl(value: string | null) {
    if (!value) {
        return "/";
    }

    try {
        const url = new URL(value, window.location.origin);
        return url.origin === window.location.origin
            ? `${url.pathname}${url.search}${url.hash}`
            : "/";
    } catch {
        return "/";
    }
}

function SignInContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated } = useAuthenticated();

    const errorCode = searchParams.get("error");
    const errorMessage = errorCode
        ? authErrorMessages[errorCode] ?? DEFAULT_AUTH_ERROR
        : null;
    const callbackUrl =
        typeof window === "undefined"
            ? "/"
            : getSafeCallbackUrl(searchParams.get("callbackUrl"));

    useEffect(() => {
        if (isAuthenticated) {
            router.replace(callbackUrl);
        }
    }, [callbackUrl, isAuthenticated, router]);

    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="space-y-8">
            <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
                <ArrowLeft className="size-3.5" />
                Back to env.garden
            </Link>

            <div className="space-y-4">
                <LogoMark className="size-10" />
                <div className="space-y-1.5">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Sign in to env.garden
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Use a magic link, Google, or GitHub. New here? Signing in
                        creates your account.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <p
                    role="alert"
                    className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                    {errorMessage}
                </p>
            ) : null}

            <AuthButtons isAuthenticated={false} callbackUrl={callbackUrl} />
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={null}>
            <SignInContent />
        </Suspense>
    );
}
