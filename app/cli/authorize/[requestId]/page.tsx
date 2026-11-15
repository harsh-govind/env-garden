import { KeyRound } from "lucide-react";
import AuthButtons from "@/components/auth/auth-buttons";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { getCliLoginRequestForAuthorization } from "@/lib/cli/login";
import type { AuthorizeCliPageProps } from "@/types/cli";
import AuthorizeCliClient from "./authorize-client";

export default async function AuthorizeCliPage({
    params,
}: AuthorizeCliPageProps) {
    const { requestId } = await params;
    const [session, loginRequest] = await Promise.all([
        auth(),
        getCliLoginRequestForAuthorization(requestId),
    ]);
    const isExpired = !loginRequest || loginRequest.expiresAt <= new Date();

    return (
        <section className="mx-auto w-full max-w-lg border border-border bg-card px-5 py-5">
            <div className="flex items-center gap-2">
                <KeyRound className="size-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">
                    Authorize Env Garden CLI
                </h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
                Approve the login request opened by <code>eit login</code>.
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
    );
}
