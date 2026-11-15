"use client";

import { Loader2, Monitor } from "lucide-react";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppSessionSummary, AppSessionsResponse } from "@/types/settings";
import type { ApiErrorPayload } from "@/types/workspace";
import { formatTimeAgo } from "@/utils";

async function fetchAppSessions(): Promise<AppSessionSummary[] | Error> {
    try {
        const response = await fetch("/api/settings/app-sessions", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
            | (AppSessionsResponse & ApiErrorPayload)
            | null;

        if (!response.ok || !payload) {
            return new Error(payload?.error ?? "Could not load sessions.");
        }

        return payload.sessions;
    } catch {
        return new Error("Could not load sessions.");
    }
}

export default function AppSessions() {
    const [sessions, setSessions] = useState<AppSessionSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);

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

    const revoke = async (sessionId: string | "others") => {
        setPendingId(sessionId);
        setError(null);

        try {
            const response = await fetch(
                sessionId === "others"
                    ? "/api/settings/app-sessions"
                    : `/api/settings/app-sessions/${encodeURIComponent(sessionId)}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
                throw new Error(payload?.error ?? "Could not sign out the session.");
            }

            applyLoadResult(await fetchAppSessions());
        } catch (revokeError) {
            setError(
                revokeError instanceof Error ? revokeError.message : "Could not sign out the session."
            );
        } finally {
            setPendingId(null);
        }
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
                        disabled={pendingId !== null}
                        onClick={() => {
                            void revoke("others");
                        }}
                    >
                        {pendingId === "others" ? <Loader2 className="animate-spin" /> : null}
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
                            <li key={session.id} className="flex items-center justify-between gap-4 px-3 py-3">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                                        <span className="truncate">{session.device}</span>
                                        {session.isCurrent ? <Badge variant="outline">This device</Badge> : null}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {session.ipAddress ? `${session.ipAddress} · ` : ""}
                                        Active {formatTimeAgo(session.lastSeenAt)}
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
                                            void signOut({ callbackUrl: "/" });
                                        }}
                                    >
                                        Sign out
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={pendingId !== null}
                                        onClick={() => {
                                            void revoke(session.id);
                                        }}
                                    >
                                        {pendingId === session.id ? <Loader2 className="animate-spin" /> : null}
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
