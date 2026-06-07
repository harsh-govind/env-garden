"use client";

import debounce from "lodash/debounce";
import { History, Search, ShieldAlert } from "lucide-react";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import UnauthenticatedHome from "@/components/home/UnauthenticatedHome";
import HistoryListSkeleton from "@/components/history/history-list-skeleton";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticated } from "@/contexts/authenticated";
import { useWorkspace } from "@/contexts/workspace";
import { createInMemoryCache } from "@/lib/cache";
import { canViewHistory } from "@/lib/constants";
import type {
    ApiErrorPayload,
    WorkspaceHistoryCacheEntry,
    WorkspaceHistoryDetail,
    WorkspaceHistoryDetailResponse,
    WorkspaceHistoryEntry,
    WorkspaceHistoryPageProps,
    WorkspaceHistoryResponse,
} from "@/types/workspace";

const historyCache = createInMemoryCache<WorkspaceHistoryCacheEntry>(5 * 60 * 1000);

function formatDate(value: string) {
    return new Date(value).toLocaleString();
}

function getErrorMessage(payload: ApiErrorPayload | null) {
    if (payload?.error && typeof payload.error === "string") {
        return payload.error;
    }

    return "Failed to load workspace history.";
}

function formatHistoryValue(value: unknown) {
    if (value === null) {
        return "null";
    }

    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }

    return String(value);
}

function HistoryDataValue({
    value,
    depth = 0,
}: {
    value: unknown;
    depth?: number;
}) {
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <span className="text-muted-foreground">[]</span>;
        }

        return (
            <div className="space-y-2">
                {value.map((item, index) => (
                    <div key={index} className="border border-border bg-background px-2 py-2">
                        <p className="mb-1 text-[11px] text-muted-foreground">Item {index + 1}</p>
                        <HistoryDataValue value={item} depth={depth + 1} />
                    </div>
                ))}
            </div>
        );
    }

    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>);

        if (entries.length === 0) {
            return <span className="text-muted-foreground">{"{}"}</span>;
        }

        return (
            <div className={depth === 0 ? "space-y-2" : "space-y-1"}>
                {entries.map(([key, entryValue]) => {
                    const isNested =
                        entryValue !== null &&
                        typeof entryValue === "object";

                    return (
                        <div
                            key={key}
                            className={
                                isNested
                                    ? "border border-border bg-muted/30 px-2 py-2"
                                    : "grid gap-1 border border-border bg-background px-2 py-2 sm:grid-cols-[12rem_1fr]"
                            }
                        >
                            <p className="font-mono text-[11px] text-muted-foreground">
                                {key}
                            </p>
                            <div className="min-w-0 text-xs text-foreground">
                                <HistoryDataValue value={entryValue} depth={depth + 1} />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <span className="break-all font-mono text-xs text-foreground">
            {formatHistoryValue(value)}
        </span>
    );
}

export default function HistoryPage({ params }: WorkspaceHistoryPageProps) {
    const { workspaceId } = use(params);
    const { isAuthenticated } = useAuthenticated();

    if (!isAuthenticated) {
        return <UnauthenticatedHome />;
    }

    return <AuthenticatedHistoryPage workspaceId={workspaceId} />;
}

function AuthenticatedHistoryPage({ workspaceId }: { workspaceId: string }) {
    const {
        activeWorkspaceId,
        activeWorkspace,
        isWorkspaceLoading,
        selectWorkspace,
    } = useWorkspace();

    const [history, setHistory] = useState<WorkspaceHistoryEntry[]>([]);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [nextHistoryCursor, setNextHistoryCursor] = useState<string | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [selectedHistoryDetail, setSelectedHistoryDetail] =
        useState<WorkspaceHistoryDetail | null>(null);
    const historyScrollRootRef = useRef<HTMLDivElement | null>(null);
    const historyLoadMoreRef = useRef<HTMLDivElement | null>(null);
    const isLoadingMoreHistoryRef = useRef(false);

    const workspace =
        activeWorkspaceId === workspaceId &&
            activeWorkspace?.id === workspaceId
            ? activeWorkspace
            : null;
    const hasHistoryAccess = workspace ? canViewHistory(workspace.role) : false;
    const historyCacheKey = useMemo(
        () => `${workspaceId}::${searchQuery}`,
        [workspaceId, searchQuery]
    );
    const activeHistoryCacheKeyRef = useRef(historyCacheKey);

    const debounceSearch = useMemo(
        () =>
            debounce((value: string) => {
                setSearchQuery(value.trim());
            }, 350),
        []
    );

    const buildHistoryEndpoint = useCallback(
        (cursor?: string | null) => {
            const params = new URLSearchParams();

            if (searchQuery.length > 0) {
                params.set("q", searchQuery);
            }

            if (cursor) {
                params.set("cursor", cursor);
            }

            const queryString = params.toString();

            return queryString
                ? `/api/workspaces/${workspaceId}/history?${queryString}`
                : `/api/workspaces/${workspaceId}/history`;
        },
        [searchQuery, workspaceId]
    );

    useEffect(() => {
        if (workspaceId !== activeWorkspaceId) {
            selectWorkspace(workspaceId);
        }
    }, [workspaceId, activeWorkspaceId, selectWorkspace]);

    useEffect(() => {
        activeHistoryCacheKeyRef.current = historyCacheKey;
    }, [historyCacheKey]);

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
        const cached = historyCache.get(historyCacheKey);

        if (cached) {
            setHistory(cached.history);
            setHasMoreHistory(cached.hasMore);
            setNextHistoryCursor(cached.nextCursor);
            setHistoryError(null);
            setIsHistoryLoading(false);
            setIsLoadingMoreHistory(false);
            isLoadingMoreHistoryRef.current = false;
            return;
        }

        const loadWorkspaceHistory = async () => {
            setIsHistoryLoading(true);
            setIsLoadingMoreHistory(false);
            setHistoryError(null);
            isLoadingMoreHistoryRef.current = false;

            try {
                const response = await fetch(buildHistoryEndpoint(), {
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
                setHasMoreHistory(payload.hasMore);
                setNextHistoryCursor(payload.nextCursor);
                historyCache.set(historyCacheKey, {
                    history: payload.history,
                    hasMore: payload.hasMore,
                    nextCursor: payload.nextCursor,
                });
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
                setHasMoreHistory(false);
                setNextHistoryCursor(null);
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
    }, [
        buildHistoryEndpoint,
        hasHistoryAccess,
        historyCacheKey,
        workspace,
    ]);

    const handleLoadMoreHistory = useCallback(async () => {
        if (
            !hasMoreHistory ||
            !nextHistoryCursor ||
            isHistoryLoading ||
            isLoadingMoreHistoryRef.current
        ) {
            return;
        }

        const cursor = nextHistoryCursor;
        const cacheKey = historyCacheKey;

        isLoadingMoreHistoryRef.current = true;
        setIsLoadingMoreHistory(true);
        setHistoryError(null);

        try {
            const response = await fetch(buildHistoryEndpoint(cursor));
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

            if (activeHistoryCacheKeyRef.current !== cacheKey) {
                return;
            }

            setHistory((currentHistory) => {
                const seenEntryIds = new Set(
                    currentHistory.map((entry) => entry.id)
                );
                const mergedHistory = [...currentHistory];

                payload.history.forEach((entry) => {
                    if (!seenEntryIds.has(entry.id)) {
                        seenEntryIds.add(entry.id);
                        mergedHistory.push(entry);
                    }
                });

                historyCache.set(cacheKey, {
                    history: mergedHistory,
                    hasMore: payload.hasMore,
                    nextCursor: payload.nextCursor,
                });

                return mergedHistory;
            });
            setHasMoreHistory(payload.hasMore);
            setNextHistoryCursor(payload.nextCursor);
            setHistoryError(null);
        } catch (historyLoadError) {
            if (activeHistoryCacheKeyRef.current !== cacheKey) {
                return;
            }

            setHistoryError(
                historyLoadError instanceof Error
                    ? historyLoadError.message
                    : "Failed to load more workspace history."
            );
            setHasMoreHistory(false);
            setNextHistoryCursor(null);
        } finally {
            isLoadingMoreHistoryRef.current = false;

            if (activeHistoryCacheKeyRef.current === cacheKey) {
                setIsLoadingMoreHistory(false);
            }
        }
    }, [
        buildHistoryEndpoint,
        hasMoreHistory,
        historyCacheKey,
        isHistoryLoading,
        nextHistoryCursor,
    ]);

    useEffect(() => {
        if (!hasMoreHistory || !nextHistoryCursor || isHistoryLoading) {
            return;
        }

        const root = historyScrollRootRef.current;
        const target = historyLoadMoreRef.current;

        if (!root || !target) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    void handleLoadMoreHistory();
                }
            },
            {
                root,
                rootMargin: "160px 0px",
                threshold: 0,
            }
        );

        observer.observe(target);

        return () => {
            observer.disconnect();
        };
    }, [
        handleLoadMoreHistory,
        hasMoreHistory,
        isHistoryLoading,
        nextHistoryCursor,
    ]);

    const handleViewHistoryDetail = async (historyId: string) => {
        setIsDetailDialogOpen(true);
        setIsDetailLoading(true);
        setDetailError(null);
        setSelectedHistoryDetail(null);

        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/history/${historyId}`
            );
            const payload = (await response.json().catch(() => null)) as
                | WorkspaceHistoryDetailResponse
                | ApiErrorPayload
                | null;

            if (!response.ok) {
                throw new Error(getErrorMessage(payload as ApiErrorPayload | null));
            }

            if (!payload || !("history" in payload)) {
                throw new Error("Received an empty history detail response.");
            }

            setSelectedHistoryDetail(payload.history);
        } catch (detailLoadError) {
            setDetailError(
                detailLoadError instanceof Error
                    ? detailLoadError.message
                    : "Failed to load history details."
            );
        } finally {
            setIsDetailLoading(false);
        }
    };

    if (!workspace) {
        return (
            <section className="border border-border bg-card p-4">
                {isWorkspaceLoading || activeWorkspaceId !== workspaceId ? (
                    <>
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Workspace not found or access denied.
                    </p>
                )}
            </section>
        );
    }

    if (!hasHistoryAccess) {
        return (
            <section className="border border-border bg-card px-4 py-5">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <ShieldAlert className="size-4" />
                    History access restricted
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                    Only workspace owners and admins can view history.
                </p>
            </section>
        );
    }

    return (
        <div className="flex h-[calc(100dvh-6rem)] min-h-0 flex-col gap-4 overflow-hidden">
            <section className="shrink-0 border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                    <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-foreground">
                        <History className="size-4" />
                        Workspace history
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Activity in {workspace.name}
                    </p>
                </div>
                <div className="px-4 py-3">
                    <label className="sr-only" htmlFor="history-search">
                        Search history
                    </label>
                    <div className="flex h-9 items-center gap-2 border border-border bg-background px-3">
                        <Search className="size-4 text-muted-foreground" />
                        <input
                            id="history-search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search by message or operation"
                            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col border border-border bg-card">
                {historyError ? (
                    <div className="shrink-0 px-4 pt-4">
                        <p className="border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                            {historyError}
                        </p>
                    </div>
                ) : null}

                <div
                    ref={historyScrollRootRef}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
                >
                    {isHistoryLoading ? (
                        <HistoryListSkeleton />
                    ) : history.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {searchQuery
                                ? "No history entries matched your search."
                                : "No history entries yet."}
                        </p>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {history.map((entry) => (
                                    <article
                                        key={entry.id}
                                        className="border border-border bg-muted/30 px-3 py-2"
                                    >
                                        <p className="text-sm font-medium text-foreground">
                                            {entry.message}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-xs text-muted-foreground">
                                                {entry.operation}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(entry.createdAt)}
                                                </p>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="xs"
                                                    onClick={() => {
                                                        void handleViewHistoryDetail(entry.id);
                                                    }}
                                                >
                                                    View details
                                                </Button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {hasMoreHistory ? (
                                <div
                                    ref={historyLoadMoreRef}
                                    className="flex justify-center py-4"
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={isLoadingMoreHistory}
                                        onClick={() => {
                                            void handleLoadMoreHistory();
                                        }}
                                    >
                                        {isLoadingMoreHistory
                                            ? "Loading history..."
                                            : "Load more"}
                                    </Button>
                                </div>
                            ) : null}

                            {isLoadingMoreHistory ? (
                                <div className="space-y-2 pt-1">
                                    <Skeleton className="h-14 w-full" />
                                    <Skeleton className="h-14 w-full" />
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </section>

            <Dialog
                open={isDetailDialogOpen}
                onOpenChange={(isOpen) => {
                    setIsDetailDialogOpen(isOpen);

                    if (!isOpen) {
                        setDetailError(null);
                        setSelectedHistoryDetail(null);
                    }
                }}
            >
                <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>History details</DialogTitle>
                        <DialogDescription>
                            {selectedHistoryDetail
                                ? `${selectedHistoryDetail.operation} at ${formatDate(selectedHistoryDetail.createdAt)}`
                                : "Loading stored event data."}
                        </DialogDescription>
                    </DialogHeader>

                    {isDetailLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : detailError ? (
                        <p className="border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                            {detailError}
                        </p>
                    ) : selectedHistoryDetail ? (
                        <div className="space-y-4">
                            <div className="border border-border bg-muted/30 px-3 py-3">
                                <p className="text-sm font-medium text-foreground">
                                    {selectedHistoryDetail.message}
                                </p>
                                <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                    <p>
                                        <span className="font-mono">entryId</span>:{" "}
                                        {selectedHistoryDetail.id}
                                    </p>
                                    <p>
                                        <span className="font-mono">workspaceId</span>:{" "}
                                        {selectedHistoryDetail.workspaceId}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h2 className="mb-2 text-sm font-medium text-foreground">
                                    Stored data
                                </h2>
                                <HistoryDataValue value={selectedHistoryDetail.data} />
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter showCloseButton />
                </DialogContent>
            </Dialog>
        </div>
    );
}
