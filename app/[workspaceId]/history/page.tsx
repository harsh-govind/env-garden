"use client";

import debounce from "lodash/debounce";
import { History, Search, ShieldAlert } from "lucide-react";
import { use, useEffect, useMemo, useState } from "react";
import UnauthenticatedHome from "@/components/home/UnauthenticatedHome";
import HistoryListSkeleton from "@/components/history/history-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticated } from "@/contexts/authenticated";
import { useWorkspace } from "@/contexts/workspace";
import { canViewHistory } from "@/lib/constants";
import type {
    ApiErrorPayload,
    WorkspaceHistoryEntry,
    WorkspaceHistoryResponse,
} from "@/types/workspace";

function formatDate(value: string) {
    return new Date(value).toLocaleString();
}

function getErrorMessage(payload: ApiErrorPayload | null) {
    if (payload?.error && typeof payload.error === "string") {
        return payload.error;
    }

    return "Failed to load workspace history.";
}

type HistoryPageProps = {
    params: Promise<{
        workspaceId: string;
    }>;
};

export default function HistoryPage({ params }: HistoryPageProps) {
    const { workspaceId } = use(params);
    const { isAuthenticated } = useAuthenticated();
    const {
        activeWorkspaceId,
        activeWorkspace,
        isWorkspaceLoading,
        selectWorkspace,
    } = useWorkspace();

    const [history, setHistory] = useState<WorkspaceHistoryEntry[]>([]);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const workspace =
        activeWorkspaceId === workspaceId &&
            activeWorkspace?.id === workspaceId
            ? activeWorkspace
            : null;
    const hasHistoryAccess = workspace ? canViewHistory(workspace.role) : false;

    const debounceSearch = useMemo(
        () =>
            debounce((value: string) => {
                setSearchQuery(value.trim());
            }, 350),
        []
    );

    useEffect(() => {
        if (workspaceId !== activeWorkspaceId) {
            selectWorkspace(workspaceId);
        }
    }, [workspaceId, activeWorkspaceId, selectWorkspace]);

    useEffect(() => {
        debounceSearch(searchInput);
    }, [searchInput, debounceSearch]);

    useEffect(() => {
        return () => {
            debounceSearch.cancel();
        };
    }, [debounceSearch]);

    useEffect(() => {
        if (!workspace || !hasHistoryAccess) {
            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams();

        if (searchQuery.length > 0) {
            params.set("q", searchQuery);
        }

        const loadWorkspaceHistory = async () => {
            setIsHistoryLoading(true);
            const queryString = params.toString();
            const endpoint = queryString
                ? `/api/workspaces/${workspaceId}/history?${queryString}`
                : `/api/workspaces/${workspaceId}/history`;

            try {
                const response = await fetch(endpoint, {
                    signal: controller.signal,
                });
                const payload = (await response.json().catch(() => null)) as
                    | WorkspaceHistoryResponse
                    | ApiErrorPayload
                    | null;

                if (!response.ok) {
                    throw new Error(getErrorMessage(payload as ApiErrorPayload | null));
                }

                if (!payload || !("history" in payload)) {
                    throw new Error("Received an empty history response.");
                }

                setHistory(payload.history);
                setHistoryError(null);
            } catch (historyLoadError) {
                if (controller.signal.aborted) {
                    return;
                }

                setHistoryError(
                    historyLoadError instanceof Error
                        ? historyLoadError.message
                        : "Failed to load workspace history."
                );
                setHistory([]);
            } finally {
                if (!controller.signal.aborted) {
                    setIsHistoryLoading(false);
                }
            }
        };

        void loadWorkspaceHistory();

        return () => {
            controller.abort();
        };
    }, [workspace, workspaceId, hasHistoryAccess, searchQuery]);

    if (!isAuthenticated) {
        return <UnauthenticatedHome />;
    }

    if (!workspace) {
        return (
            <section className="border border-zinc-800 bg-[#090b11] p-4">
                {isWorkspaceLoading || activeWorkspaceId !== workspaceId ? (
                    <>
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
                    </>
                ) : (
                    <p className="text-sm text-zinc-400">
                        Workspace not found or access denied.
                    </p>
                )}
            </section>
        );
    }

    if (!hasHistoryAccess) {
        return (
            <section className="border border-zinc-800 bg-[#090b11] px-4 py-5">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-zinc-200">
                    <ShieldAlert className="size-4" />
                    History access restricted
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                    Only workspace owners and admins can view history.
                </p>
            </section>
        );
    }

    return (
        <div className="space-y-4">
            <section className="border border-zinc-800 bg-[#090b11]">
                <div className="border-b border-zinc-800 px-4 py-3">
                    <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-zinc-100">
                        <History className="size-4" />
                        Workspace history
                    </h1>
                    <p className="mt-1 text-sm text-zinc-400">
                        Activity in {workspace.name}
                    </p>
                </div>
                <div className="px-4 py-3">
                    <label className="sr-only" htmlFor="history-search">
                        Search history
                    </label>
                    <div className="flex h-9 items-center gap-2 border border-zinc-700 bg-zinc-950 px-3">
                        <Search className="size-4 text-zinc-500" />
                        <input
                            id="history-search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search by message or operation"
                            className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                        />
                    </div>
                </div>
            </section>

            <section className="border border-zinc-800 bg-[#090b11] px-4 py-4">
                {historyError ? (
                    <p className="mb-3 border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                        {historyError}
                    </p>
                ) : null}

                {isHistoryLoading ? (
                    <HistoryListSkeleton />
                ) : history.length === 0 ? (
                    <p className="text-sm text-zinc-400">
                        {searchQuery
                            ? "No history entries matched your search."
                            : "No history entries yet."}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {history.map((entry) => (
                            <article
                                key={entry.id}
                                className="border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                            >
                                <p className="text-sm font-medium text-zinc-100">
                                    {entry.message}
                                </p>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs text-zinc-500">
                                        {entry.operation}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {formatDate(entry.createdAt)}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
