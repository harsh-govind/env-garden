import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { CLI_TOKEN_TTL_DAYS } from "@/constants/cli";
import { SETTINGS_SESSIONS_PATH } from "@/constants/routes";
import AuthButtons from "@/components/auth/auth-buttons";
import { Separator } from "@/components/ui/separator";
import { getSession } from "@/lib/auth";
import { getCliLoginRequestForAuthorization } from "@/lib/cli/login";
import type { AuthorizeCliPageProps } from "@/types/cli";
import AuthorizeCliClient from "./authorize-client";

export default async function AuthorizeCliPage({
    params,
}: AuthorizeCliPageProps) {
    const { requestId } = await params;
    const [session, loginRequest] = await Promise.all([
        getSession(),
        getCliLoginRequestForAuthorization(requestId),
    ]);
    const isExpired = !loginRequest || loginRequest.expiresAt <= new Date();

    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-16">
            <section className="w-full max-w-lg border border-border bg-card px-5 py-5">
                <div className="flex items-center gap-2">
                    <LogoMark className="size-6" />
                    <h1 className="text-xl font-semibold text-foreground">
                        Authorize Env Garden CLI
                    </h1>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                    Approve the login request opened by <code>eit login</code>. Access lasts{" "}
                    {CLI_TOKEN_TTL_DAYS} days and can be revoked anytime from your{" "}
                    <Link href={SETTINGS_SESSIONS_PATH} className="underline underline-offset-2">
                        settings
                    </Link>
                    .
                </p>

                <Separator className="my-5" />

                {isExpired ? (
                    <p className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        This CLI login request is invalid or has expired. Run <code>eit login</code> again.
                    </p>
                ) : !session?.user?.id || !session.user.email ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Sign in to choose the Env Garden account for this CLI.
                        </p>
                        <AuthButtons isAuthenticated={false} />
                    </div>
                ) : (
                    <AuthorizeCliClient
                        requestId={loginRequest.id}
                        tokenName={loginRequest.tokenName}
                        userEmail={session.user.email}
                        isAlreadyApproved={Boolean(loginRequest.approvedAt)}
                    />
                )}
            </section>
        </main>
    );
}
