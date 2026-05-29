"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useAuthenticated } from "@/contexts/authenticated";
import type {
    ApiErrorPayload,
    CreateWorkspaceRequest,
    CreateWorkspaceResponse,
    WorkspaceContextValue,
    WorkspaceDetail,
    WorkspaceResponse,
    WorkspaceSummary,
    WorkspacesResponse,
} from "@/types/workspace";

const ACTIVE_WORKSPACE_STORAGE_KEY = "env-garden.activeWorkspaceId";

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong while loading workspace data.";
}

async function fetchJson<T>(
    input: RequestInfo,
    init?: RequestInit
): Promise<T> {
    const response = await fetch(input, init);
    const payload = (await response.json().catch(() => null)) as
        | ApiErrorPayload
        | T
        | null;

    if (!response.ok) {
        const message =
            payload &&
                typeof payload === "object" &&
                "error" in payload &&
                typeof payload.error === "string"
                ? payload.error
                : "Request failed.";

        throw new Error(message);
    }

    if (!payload) {
        throw new Error("Received an empty response from the server.");
    }

    return payload as T;
}

function getStoredWorkspaceId() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
}

function persistWorkspaceId(workspaceId: string | null) {
    if (typeof window === "undefined") {
        return;
    }

    if (!workspaceId) {
        window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceId);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuthenticated();

    const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
    const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
    const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshWorkspaces = useCallback(async () => {
        if (!isAuthenticated) {
            setWorkspaces([]);
            setActiveWorkspaceId(null);
            setActiveWorkspace(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetchJson<WorkspacesResponse>("/api/workspaces");
            const nextWorkspaces = response.workspaces;
            const storedWorkspaceId = getStoredWorkspaceId();

            setWorkspaces(nextWorkspaces);
            setActiveWorkspaceId((currentWorkspaceId) => {
                if (
                    currentWorkspaceId &&
                    nextWorkspaces.some((workspace) => workspace.id === currentWorkspaceId)
                ) {
                    return currentWorkspaceId;
                }

                if (
                    storedWorkspaceId &&
                    nextWorkspaces.some((workspace) => workspace.id === storedWorkspaceId)
                ) {
                    return storedWorkspaceId;
                }

                return nextWorkspaces[0]?.id ?? null;
            });
            setError(null);
        } catch (refreshError) {
            setError(getErrorMessage(refreshError));
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    const selectWorkspace = useCallback((workspaceId: string) => {
        setActiveWorkspaceId(workspaceId);
        persistWorkspaceId(workspaceId);
    }, []);

    const createWorkspace = useCallback(
        async (input: CreateWorkspaceRequest) => {
            setIsCreatingWorkspace(true);

            try {
                const response = await fetchJson<CreateWorkspaceResponse>(
                    "/api/workspaces",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(input),
                    }
                );

                await refreshWorkspaces();
                setActiveWorkspaceId(response.workspace.id);
                persistWorkspaceId(response.workspace.id);
                setError(null);
            } catch (createError) {
                const message = getErrorMessage(createError);
                setError(message);
                throw new Error(message);
            } finally {
                setIsCreatingWorkspace(false);
            }
        },
        [refreshWorkspaces]
    );

    useEffect(() => {
        void refreshWorkspaces();
    }, [refreshWorkspaces]);

    useEffect(() => {
        if (!isAuthenticated || !activeWorkspaceId) {
            setActiveWorkspace(null);
            setIsWorkspaceLoading(false);
            persistWorkspaceId(activeWorkspaceId);
            return;
        }

        const controller = new AbortController();

        const loadWorkspace = async () => {
            setIsWorkspaceLoading(true);

            try {
                const response = await fetchJson<WorkspaceResponse>(
                    `/api/workspaces/${activeWorkspaceId}`,
                    {
                        signal: controller.signal,
                    }
                );

                setActiveWorkspace(response.workspace);
                setError(null);
                persistWorkspaceId(activeWorkspaceId);
            } catch (workspaceError) {
                if (!controller.signal.aborted) {
                    setError(getErrorMessage(workspaceError));
                    setActiveWorkspace(null);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsWorkspaceLoading(false);
                }
            }
        };

        void loadWorkspace();

        return () => {
            controller.abort();
        };
    }, [activeWorkspaceId, isAuthenticated]);

    const value = useMemo<WorkspaceContextValue>(
        () => ({
            workspaces,
            activeWorkspaceId,
            activeWorkspace,
            isLoading,
            isWorkspaceLoading,
            isCreatingWorkspace,
            error,
            selectWorkspace,
            refreshWorkspaces,
            createWorkspace,
        }),
        [
            activeWorkspace,
            activeWorkspaceId,
            createWorkspace,
            error,
            isCreatingWorkspace,
            isLoading,
            isWorkspaceLoading,
            refreshWorkspaces,
            selectWorkspace,
            workspaces,
        ]
    );

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);

    if (!context) {
        throw new Error("useWorkspace must be used within WorkspaceProvider.");
    }

    return context;
}
