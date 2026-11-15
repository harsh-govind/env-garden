"use client";

import { Loader2, Terminal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CLI_TOKEN_TTL_DAYS } from "@/constants/cli";
import type { CliSession, CliSessionsResponse } from "@/types/cli";
import type { ApiErrorPayload } from "@/types/workspace";
import { formatTimeAgo } from "@/utils";

function formatDate(value: string | null) {
    if (!value) {
        return "—";
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

async function fetchSessions(): Promise<CliSession[] | Error> {
    try {
        const response = await fetch("/api/profile/cli-sessions", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
            | (CliSessionsResponse & ApiErrorPayload)
            | null;

        if (!response.ok || !payload) {
            return new Error(payload?.error ?? "Could not load CLI sessions.");
        }

        return payload.sessions;
    } catch {
        return new Error("Could not load CLI sessions.");
    }
}

export default function CliSessions() {
    const [sessions, setSessions] = useState<CliSession[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);

    const applyLoadResult = useCallback((result: CliSession[] | Error) => {
        if (result instanceof Error) {
            setError(result.message);
            return;
        }

        setSessions(result);
        setError(null);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        void fetchSessions().then((result) => {
            if (!isCancelled) {
                applyLoadResult(result);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [applyLoadResult]);

    const revoke = async (tokenId: string | "all") => {
        setPendingId(tokenId);
        setError(null);

        try {
            const response = await fetch(
                tokenId === "all"
                    ? "/api/profile/cli-sessions"
                    : `/api/profile/cli-sessions/${encodeURIComponent(tokenId)}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
                throw new Error(payload?.error ?? "Could not revoke the CLI session.");
            }

            applyLoadResult(await fetchSessions());
        } catch (revokeError) {
            setError(
                revokeError instanceof Error ? revokeError.message : "Could not revoke the CLI session."
            );
        } finally {
            setPendingId(null);
        }
    };

    return (
        <section className="mx-auto mt-4 max-w-2xl border border-border bg-card">
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
                <div>
                    <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Terminal className="size-4" />
                        CLI sessions
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Devices signed in with <code className="font-mono">eit login</code>. Sessions
                        expire after {CLI_TOKEN_TTL_DAYS} days.
                    </p>
                </div>
                {sessions && sessions.length > 1 ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pendingId !== null}
                        onClick={() => {
                            void revoke("all");
                        }}
                    >
                        {pendingId === "all" ? <Loader2 className="animate-spin" /> : null}
                        Revoke all
                    </Button>
                ) : null}
            </div>

            <div className="px-4 py-4">
                {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

                {sessions === null ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No active CLI sessions. Run <code className="font-mono">npx @env-garden/cli login</code> to
                        connect a terminal.
                    </p>
                ) : (
                    <ul className="divide-y divide-border border border-border">
                        {sessions.map((session) => (
                            <li key={session.id} className="flex items-center justify-between gap-4 px-3 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">{session.name}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        <span className="font-mono">{session.tokenPrefix}…</span>
                                        {" · "}
                                        {session.lastUsedAt
                                            ? `Last used ${formatTimeAgo(session.lastUsedAt)}`
                                            : "Never used"}
                                        {" · "}
                                        Expires {formatDate(session.expiresAt)}
                                    </p>
                                </div>
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
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
