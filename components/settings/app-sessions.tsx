"use client";

import { Loader2, Monitor } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient, signOutAndGoHome } from "@/lib/auth-client";
import type { AppSessionSummary } from "@/types/settings";
import { formatTimeAgo } from "@/utils";
import { describeUserAgent } from "@/utils/user-agent/describe-user-agent";

async function fetchAppSessions(): Promise<AppSessionSummary[] | Error> {
    const [{ data: sessions, error }, { data: current }] = await Promise.all([
        authClient.listSessions(),
        authClient.getSession(),
    ]);

    if (error || !sessions) {
        return new Error(error?.message ?? "Could not load sessions.");
    }

    return sessions
        .map((session) => ({
            token: session.token,
            device: describeUserAgent(session.userAgent ?? null),
            ipAddress: session.ipAddress ?? null,
            createdAt: new Date(session.createdAt).toISOString(),
            lastActiveAt: new Date(session.updatedAt).toISOString(),
            isCurrent: session.token === current?.session.token,
        }))
        .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.lastActiveAt.localeCompare(a.lastActiveAt));
}

export default function AppSessions() {
    const router = useRouter();
    const [sessions, setSessions] = useState<AppSessionSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendingToken, setPendingToken] = useState<string | null>(null);

    const applyLoadResult = useCallback((result: AppSessionSummary[] | Error) => {
        if (result instanceof Error) {
            setError(result.message);
            return;
        }

        setSessions(result);
        setError(null);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        void fetchAppSessions().then((result) => {
            if (!isCancelled) {
                applyLoadResult(result);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [applyLoadResult]);

    const revoke = async (token: string | "others") => {
        setPendingToken(token);
        setError(null);

        const { error: revokeError } =
            token === "others"
                ? await authClient.revokeOtherSessions()
                : await authClient.revokeSession({ token });

        if (revokeError) {
            setError(revokeError.message ?? "Could not sign out the session.");
        } else {
            applyLoadResult(await fetchAppSessions());
        }

        setPendingToken(null);
    };

    const otherSessionCount = sessions?.filter((session) => !session.isCurrent).length ?? 0;

    return (
        <section className="border border-border bg-card">
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
                <div>
                    <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Monitor className="size-4" />
                        App sessions
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Browsers signed in to Env Garden.
                    </p>
                </div>
                {otherSessionCount > 0 ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pendingToken !== null}
                        onClick={() => {
                            void revoke("others");
                        }}
                    >
                        {pendingToken === "others" ? <Loader2 className="animate-spin" /> : null}
                        Sign out other sessions
                    </Button>
                ) : null}
            </div>

            <div className="px-4 py-4">
                {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

                {sessions === null ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active sessions.</p>
                ) : (
                    <ul className="divide-y divide-border border border-border">
                        {sessions.map((session) => (
                            <li key={session.token} className="flex items-center justify-between gap-4 px-3 py-3">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                                        <span className="truncate">{session.device}</span>
                                        {session.isCurrent ? <Badge variant="outline">This device</Badge> : null}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {session.ipAddress ? `${session.ipAddress} · ` : ""}
                                        Active {formatTimeAgo(session.lastActiveAt)}
                                        {" · "}
                                        Signed in {formatTimeAgo(session.createdAt)}
                                    </p>
                                </div>
                                {session.isCurrent ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            void signOutAndGoHome(router);
                                        }}
                                    >
                                        Sign out
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={pendingToken !== null}
                                        onClick={() => {
                                            void revoke(session.token);
                                        }}
                                    >
                                        {pendingToken === session.token ? <Loader2 className="animate-spin" /> : null}
                                        Revoke
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
