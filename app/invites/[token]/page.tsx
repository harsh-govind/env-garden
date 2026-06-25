"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import AuthButtons from "@/components/auth/auth-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthenticated } from "@/contexts/authenticated";
import { useWorkspace } from "@/contexts/workspace";
import type {
    AcceptWorkspaceInviteResponse,
    WorkspaceInvitePageProps,
} from "@/types/member";
import type { ApiErrorPayload } from "@/types/workspace";

function getErrorMessage(payload: ApiErrorPayload | null) {
    return payload?.error && typeof payload.error === "string"
        ? payload.error
        : "Failed to accept invite.";
}

export default function WorkspaceInvitePage({ params }: WorkspaceInvitePageProps) {
    const { token } = use(params);
    const { isAuthenticated } = useAuthenticated();

    if (!isAuthenticated) {
        return (
            <>
                <Badge variant="outline">Workspace invite</Badge>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                    Sign in to accept
                </h1>
                <p className="text-muted-foreground">
                    Use the account with the email address this invite was sent to.
                </p>
                <AuthButtons isAuthenticated={false} />
            </>
        );
    }

    return <AuthenticatedInvite token={token} />;
}

function AuthenticatedInvite({ token }: { token: string }) {
    const router = useRouter();
    const { refreshWorkspaces, selectWorkspace } = useWorkspace();
    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const acceptInvite = async () => {
        setIsAccepting(true);
        setError(null);

        try {
            const response = await fetch(`/api/workspace-invites/${token}/accept`, {
                method: "POST",
            });
            const payload = (await response.json().catch(() => null)) as
                | AcceptWorkspaceInviteResponse
                | ApiErrorPayload
                | null;

            if (!response.ok) {
                throw new Error(getErrorMessage(payload as ApiErrorPayload | null));
            }

            if (!payload || !("workspaceId" in payload)) {
                throw new Error("Received an empty invite response.");
            }

            await refreshWorkspaces();
            selectWorkspace(payload.workspaceId);
            router.replace("/");
            router.refresh();
        } catch (acceptError) {
            setError(
                acceptError instanceof Error
                    ? acceptError.message
                    : "Failed to accept invite."
            );
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl space-y-4">
            <Badge variant="outline">Workspace invite</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Accept invite
            </h1>
            <p className="text-sm text-muted-foreground">
                The invite will be added to the signed-in account if the email matches.
            </p>

            {error ? (
                <p className="border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                    {error}
                </p>
            ) : null}

            <Button type="button" disabled={isAccepting} onClick={acceptInvite}>
                {isAccepting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                {isAccepting ? "Accepting..." : "Accept invite"}
            </Button>
        </div>
    );
}
