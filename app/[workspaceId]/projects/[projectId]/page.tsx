"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    ArrowLeft,
    Copy,
    Eye,
    EyeOff,
    MoreHorizontal,
    FilePlus2,
    Hash,
    KeyRound,
    Pencil,
    Plus,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    SquareCheck,
    StickyNote,
    StickyNotePlus,
    Trash2,
    X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    defaultProjectEnvironmentTypes,
    environmentTypeLabels,
    environmentTypes,
    formatEnvironmentFileName,
} from "@/constants/environment";
import {
    ENV_VARIABLE_KEY_MAX_LENGTH,
    ENV_VARIABLE_NOTE_MAX_LENGTH,
    ENV_VARIABLE_VALUE_MAX_LENGTH,
    envKeyPattern,
    environmentOrder,
} from "@/constants/environment";
import { useAuthenticated } from "@/contexts/authenticated";
import { useVault } from "@/contexts/vault";
import { wipeEnvironmentKey } from "@/lib/crypto/environment";
import {
    createEnvironmentKeyForSelf,
    decryptEnvFileVariables,
    encryptEnvFileVariables,
    openProjectEnvironmentKey,
} from "@/lib/environment-crypto";
import { buildEnvText, parseEnvText } from "@/utils/env/env-file";
import { findMostRecentUpdatedAt } from "@/utils/time/updated-at";
import { formatTimeAgo } from "@/utils";
import type { AccountKeys, EnvironmentKeyMaterial } from "@/types/crypto";
import type {
    CreateEnvFileResponse,
    DeleteEnvFileResponse,
    DeleteProjectResponse,
    EnvVariablesCipherResponse,
    ParsedEnvRow,
    ProjectDetail,
    ProjectDetailResponse,
    ProjectEnvFile,
    ProjectEnvVariable,
    ProjectEnvironmentKey,
    RenameEnvFileResponse,
    RenameProjectResponse,
    SaveEnvVariablesResponse,
    VariableDraftRow,
} from "@/types/project";
import type { ApiErrorPayload, EnvironmentTypeValue } from "@/types/workspace";

function getRouteParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Request failed.";
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

function sortEnvFiles(envFiles: ProjectEnvFile[]) {
    return [...envFiles].sort((a, b) => {
        const aOrder = environmentOrder.get(a.environment) ?? 999;
        const bOrder = environmentOrder.get(b.environment) ?? 999;

        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }

        return a.name.localeCompare(b.name);
    });
}

function getEnvironmentColor(environment: EnvironmentTypeValue) {
    return (
        environmentTypes.find((environmentType) => environmentType.key === environment)
            ?.color ?? "#64748B"
    );
}

function createDraftClientId() {
    return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type EnvironmentKeyStatus =
    | { status: "ready" }
    | { status: "awaiting" }
    | { status: "error"; message: string };

type CachedEnvironmentKey = {
    version: number;
    material: EnvironmentKeyMaterial;
};

type DecryptedProjectState = {
    plainVariablesByFileId: Record<string, ProjectEnvVariable[]>;
    environmentStatuses: Record<string, EnvironmentKeyStatus>;
};

function toVariableDraftRows(variables: ProjectEnvVariable[]): VariableDraftRow[] {
    const rows = variables.map((variable) => ({
        clientId: variable.id,
        variableId: variable.id,
        key: variable.key,
        value: variable.value,
        originalValue: variable.value,
        isValueEditable: false,
        note: variable.note ?? "",
        isNoteOpen: Boolean(variable.note),
        isCommented: variable.isCommented,
    }));

    return rows.length > 0 ? rows : [createEmptyDraftRow()];
}

function createEmptyDraftRow(): VariableDraftRow {
    return {
        clientId: createDraftClientId(),
        key: "",
        value: "",
        originalValue: "",
        isValueEditable: true,
        note: "",
        isNoteOpen: false,
        isCommented: false,
    };
}

function parseEnvClipboardText(text: string): ParsedEnvRow[] {
    return parseEnvText(text);
}

function createDraftRowFromParsedEnv(parsedRow: ParsedEnvRow): VariableDraftRow {
    return {
        clientId: createDraftClientId(),
        key: parsedRow.key,
        value: parsedRow.value,
        originalValue: "",
        isValueEditable: true,
        note: parsedRow.note,
        isNoteOpen: Boolean(parsedRow.note),
        isCommented: parsedRow.isCommented,
    };
}

function areVariableDraftRowsEqual(
    currentRows: VariableDraftRow[],
    baselineRows: VariableDraftRow[]
) {
    if (currentRows.length !== baselineRows.length) {
        return false;
    }

    return currentRows.every((currentRow, index) => {
        const baselineRow = baselineRows[index];

        return (
            currentRow.variableId === baselineRow.variableId &&
            currentRow.key === baselineRow.key &&
            currentRow.note === baselineRow.note &&
            currentRow.isCommented === baselineRow.isCommented &&
            currentRow.value === currentRow.originalValue
        );
    });
}

function buildEnvClipboardText(
    rows: {
        key: string;
        value: string;
        note?: string | null;
        isCommented?: boolean;
    }[]
): { text: string } | { error: string } {
    const entries: typeof rows = [];
    const seenKeys = new Set<string>();

    for (const row of rows) {
        const key = row.key.trim();
        const note = row.note?.trim() ?? "";

        if (key.length === 0 && row.value.length === 0 && note.length === 0) {
            continue;
        }

        if (!envKeyPattern.test(key)) {
            return {
                error:
                    "Variable keys must start with a letter or underscore and contain only letters, numbers, and underscores.",
            };
        }

        if (seenKeys.has(key)) {
            return {
                error: `Duplicate variable key: ${key}.`,
            };
        }

        seenKeys.add(key);
        entries.push({ ...row, key });
    }

    if (entries.length === 0) {
        return {
            error: "Add at least one variable to copy.",
        };
    }

    return {
        text: buildEnvText(entries),
    };
}

function escapeRegexSource(value: string) {
    return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function normalizeRegexFlags(flags: string) {
    const allowedFlags = new Set(["i", "m", "s", "u"]);
    const normalizedFlags = new Set<string>();

    flags.split("").forEach((flag) => {
        if (allowedFlags.has(flag)) {
            normalizedFlags.add(flag);
        }
    });

    normalizedFlags.add("i");

    return [...normalizedFlags].join("");
}

function createWildcardKeyPattern(query: string) {
    const source = query
        .split("*")
        .map((asteriskPart) =>
            asteriskPart
                .split("?")
                .map(escapeRegexSource)
                .join(".")
        )
        .join(".*");

    return new RegExp(`^${source}$`, "i");
}

function createVariableKeyPattern(query: string) {
    const slashPatternMatch = /^\/(.+)\/([a-z]*)$/i.exec(query);

    if (slashPatternMatch) {
        const [, source, flags] = slashPatternMatch;

        return new RegExp(source, normalizeRegexFlags(flags));
    }

    const looksLikeRegex = query.includes(".*") || /[\\^$+{}()[\]|]/.test(query);

    if (looksLikeRegex) {
        return new RegExp(query, "i");
    }

    if (/[*?]/.test(query)) {
        return createWildcardKeyPattern(query);
    }

    return null;
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = getRouteParam(params.workspaceId);
    const projectId = getRouteParam(params.projectId);
    const { user } = useAuthenticated();
    const { keys } = useVault();
    const userId = user?.id ?? null;
    const environmentKeyCacheRef = useRef(new Map<string, CachedEnvironmentKey>());

    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [plainVariablesByFileId, setPlainVariablesByFileId] = useState<
        Record<string, ProjectEnvVariable[]>
    >({});
    const [environmentStatuses, setEnvironmentStatuses] = useState<
        Record<string, EnvironmentKeyStatus>
    >({});
    const [activeEnvFileId, setActiveEnvFileId] = useState<string | null>(null);
    const [revealedVariableIds, setRevealedVariableIds] = useState<Set<string>>(
        () => new Set()
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isRenamingProject, setIsRenamingProject] = useState(false);
    const [projectDraftName, setProjectDraftName] = useState("");
    const [isSavingProjectName, setIsSavingProjectName] = useState(false);
    const [projectNameError, setProjectNameError] = useState<string | null>(null);
    const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
    const [isDeletingProject, setIsDeletingProject] = useState(false);

    const [envFileEnvironment, setEnvFileEnvironment] =
        useState<EnvironmentTypeValue>(defaultProjectEnvironmentTypes[0]);
    const [envFileName, setEnvFileName] = useState("");
    const [envFileDescription, setEnvFileDescription] = useState("");
    const [isCreateEnvFileOpen, setIsCreateEnvFileOpen] = useState(false);
    const [isCreatingEnvFile, setIsCreatingEnvFile] = useState(false);
    const [envFileError, setEnvFileError] = useState<string | null>(null);

    const [renamingEnvFileId, setRenamingEnvFileId] = useState<string | null>(null);
    const [envFileDraftName, setEnvFileDraftName] = useState("");
    const [isSavingEnvFileName, setIsSavingEnvFileName] = useState(false);
    const [envFileNameRenameError, setEnvFileNameRenameError] = useState<string | null>(
        null
    );
    const [envFileIdPendingDelete, setEnvFileIdPendingDelete] = useState<string | null>(
        null
    );
    const [isDeletingEnvFile, setIsDeletingEnvFile] = useState(false);
    const [envFileDeleteError, setEnvFileDeleteError] = useState<string | null>(null);

    const [variableDraftRows, setVariableDraftRows] = useState<VariableDraftRow[]>([]);
    const [selectedDraftRowIds, setSelectedDraftRowIds] = useState<Set<string>>(
        () => new Set()
    );
    const [variableSearchQuery, setVariableSearchQuery] = useState("");
    const [isSavingVariables, setIsSavingVariables] = useState(false);
    const [isCopyingVariables, setIsCopyingVariables] = useState(false);
    const [hasCopiedVariables, setHasCopiedVariables] = useState(false);
    const [variableError, setVariableError] = useState<string | null>(null);
    const copyFeedbackTimeoutRef = useRef<number | null>(null);

    const projectUrl = `/api/workspaces/${workspaceId}/projects/${projectId}`;

    useEffect(() => {
        const cache = environmentKeyCacheRef.current;

        return () => {
            cache.forEach(({ material }) => {
                void wipeEnvironmentKey(material);
            });
            cache.clear();
        };
    }, []);

    const getEnvironmentKeyMaterial = useCallback(
        async (
            environmentKey: ProjectEnvironmentKey,
            accountKeys: AccountKeys,
            accountUserId: string
        ) => {
            const cache = environmentKeyCacheRef.current;
            const cached = cache.get(environmentKey.id);

            if (cached && cached.version === environmentKey.version) {
                return cached.material;
            }

            const material = await openProjectEnvironmentKey({
                environmentKey,
                keys: accountKeys,
                userId: accountUserId,
            });

            if (!material) {
                return null;
            }

            if (cached) {
                void wipeEnvironmentKey(cached.material);
            }

            cache.set(environmentKey.id, { version: environmentKey.version, material });
            return material;
        },
        []
    );

    const decryptProject = useCallback(
        async (nextProject: ProjectDetail): Promise<DecryptedProjectState> => {
            const plain: Record<string, ProjectEnvVariable[]> = {};
            const statuses: Record<string, EnvironmentKeyStatus> = {};

            if (!keys || !userId) {
                return { plainVariablesByFileId: plain, environmentStatuses: statuses };
            }

            const materials = new Map<string, EnvironmentKeyMaterial>();

            for (const environmentKey of nextProject.environmentKeys) {
                try {
                    const material = await getEnvironmentKeyMaterial(environmentKey, keys, userId);

                    if (material) {
                        materials.set(environmentKey.environment, material);
                        statuses[environmentKey.environment] = { status: "ready" };
                    } else {
                        statuses[environmentKey.environment] = { status: "awaiting" };
                    }
                } catch (openError) {
                    statuses[environmentKey.environment] = {
                        status: "error",
                        message: getErrorMessage(openError),
                    };
                }
            }

            for (const envFile of nextProject.envFiles) {
                const material = materials.get(envFile.environment);
                statuses[envFile.environment] ??= { status: "awaiting" };

                if (!material) {
                    continue;
                }

                try {
                    plain[envFile.id] = await decryptEnvFileVariables({ envFile, material });
                } catch (decryptError) {
                    statuses[envFile.environment] = {
                        status: "error",
                        message: getErrorMessage(decryptError),
                    };
                }
            }

            return { plainVariablesByFileId: plain, environmentStatuses: statuses };
        },
        [getEnvironmentKeyMaterial, keys, userId]
    );

    const getPlainVariables = useCallback(
        (envFileId: string) => plainVariablesByFileId[envFileId] ?? [],
        [plainVariablesByFileId]
    );

    const requestProject = useCallback(
        (signal?: AbortSignal) =>
            fetchJson<ProjectDetailResponse>(projectUrl, {
                signal,
            }),
        [projectUrl]
    );

    useEffect(() => {
        const controller = new AbortController();
        let isCurrent = true;

        requestProject(controller.signal)
            .then(async (response) => {
                const decrypted = await decryptProject(response.project);

                if (!isCurrent) {
                    return;
                }

                setProject(response.project);
                setPlainVariablesByFileId(decrypted.plainVariablesByFileId);
                setEnvironmentStatuses(decrypted.environmentStatuses);
                const firstEnvFile = response.project.envFiles[0] ?? null;
                setActiveEnvFileId(firstEnvFile?.id ?? null);
                setVariableDraftRows(
                    firstEnvFile
                        ? toVariableDraftRows(
                            decrypted.plainVariablesByFileId[firstEnvFile.id] ?? []
                        )
                        : []
                );
                setSelectedDraftRowIds(new Set());
                setRevealedVariableIds(new Set());
                setError(null);
            })
            .catch((loadError) => {
                if (!controller.signal.aborted && isCurrent) {
                    setError(getErrorMessage(loadError));
                    setProject(null);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted && isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, [decryptProject, requestProject]);

    useEffect(() => {
        return () => {
            if (copyFeedbackTimeoutRef.current !== null) {
                window.clearTimeout(copyFeedbackTimeoutRef.current);
            }
        };
    }, []);

    const refreshProject = useCallback(async () => {
        setIsRefreshing(true);

        try {
            const response = await requestProject();
            const decrypted = await decryptProject(response.project);
            const nextActiveEnvFile =
                (activeEnvFileId
                    ? response.project.envFiles.find(
                        (envFile) => envFile.id === activeEnvFileId
                    )
                    : null) ??
                response.project.envFiles[0] ??
                null;

            setProject(response.project);
            setPlainVariablesByFileId(decrypted.plainVariablesByFileId);
            setEnvironmentStatuses(decrypted.environmentStatuses);
            setActiveEnvFileId(nextActiveEnvFile?.id ?? null);
            setVariableDraftRows(
                nextActiveEnvFile
                    ? toVariableDraftRows(
                        decrypted.plainVariablesByFileId[nextActiveEnvFile.id] ?? []
                    )
                    : []
            );
            setSelectedDraftRowIds(new Set());
            setRevealedVariableIds(new Set());
            setError(null);
        } catch (refreshError) {
            setError(getErrorMessage(refreshError));
        } finally {
            setIsRefreshing(false);
        }
    }, [activeEnvFileId, decryptProject, requestProject]);

    const startRenamingProject = useCallback(() => {
        if (!project?.canManage) {
            return;
        }

        setProjectDraftName(project.name);
        setProjectNameError(null);
        setIsRenamingProject(true);
    }, [project]);

    const cancelRenamingProject = useCallback(() => {
        setIsRenamingProject(false);
        setProjectDraftName("");
        setProjectNameError(null);
    }, []);

    const handleRenameProject = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (!project?.canManage) {
                setProjectNameError("Only project or workspace admins can rename this project.");
                return;
            }

            const name = projectDraftName.trim();

            if (name.length < 2 || name.length > 80) {
                setProjectNameError("Project name must be between 2 and 80 characters.");
                return;
            }

            setIsSavingProjectName(true);

            try {
                const response = await fetchJson<RenameProjectResponse>(projectUrl, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name,
                    }),
                });

                setProject((currentProject) => {
                    if (!currentProject) {
                        return currentProject;
                    }

                    return {
                        ...currentProject,
                        name: response.project.name,
                        updatedAt: response.project.updatedAt,
                    };
                });
                setIsRenamingProject(false);
                setProjectDraftName("");
                setProjectNameError(null);
            } catch (renameError) {
                setProjectNameError(getErrorMessage(renameError));
            } finally {
                setIsSavingProjectName(false);
            }
        },
        [project?.canManage, projectDraftName, projectUrl]
    );

    const startRenamingEnvFile = useCallback(
        (envFile: ProjectEnvFile) => {
            if (!project?.canManage) {
                return;
            }

            setRenamingEnvFileId(envFile.id);
            setEnvFileDraftName(envFile.name);
            setEnvFileNameRenameError(null);
        },
        [project?.canManage]
    );

    const cancelRenamingEnvFile = useCallback(() => {
        setRenamingEnvFileId(null);
        setEnvFileDraftName("");
        setEnvFileNameRenameError(null);
    }, []);

    const handleRenameEnvFile = useCallback(
        async (event: FormEvent<HTMLFormElement>, envFileId: string) => {
            event.preventDefault();

            if (!project?.canManage) {
                setEnvFileNameRenameError(
                    "Only project or workspace admins can rename env files."
                );
                return;
            }

            const name = envFileDraftName.trim();

            if (name.length === 0 || name.length > 120) {
                setEnvFileNameRenameError("Env file name must be 120 characters or less.");
                return;
            }

            setIsSavingEnvFileName(true);

            try {
                const response = await fetchJson<RenameEnvFileResponse>(
                    `${projectUrl}/env-files/${envFileId}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            name,
                        }),
                    }
                );

                setProject((currentProject) => {
                    if (!currentProject) {
                        return currentProject;
                    }

                    return {
                        ...currentProject,
                        envFiles: currentProject.envFiles.map((currentEnvFile) =>
                            currentEnvFile.id === envFileId
                                ? response.envFile
                                : currentEnvFile
                        ),
                    };
                });

                if (activeEnvFileId === envFileId) {
                    setActiveEnvFileId(envFileId);
                }

                setRenamingEnvFileId(null);
                setEnvFileDraftName("");
                setEnvFileNameRenameError(null);
            } catch (renameError) {
                setEnvFileNameRenameError(getErrorMessage(renameError));
            } finally {
                setIsSavingEnvFileName(false);
            }
        },
        [activeEnvFileId, envFileDraftName, project?.canManage, projectUrl]
    );

    const handleDeleteProject = useCallback(async () => {
        if (!project?.canManage) {
            setProjectNameError("Only project or workspace admins can delete this project.");
            return;
        }

        setIsDeletingProject(true);

        try {
            await fetchJson<DeleteProjectResponse>(projectUrl, {
                method: "DELETE",
            });

            setIsDeleteProjectDialogOpen(false);
            router.push("/");
        } catch (deleteError) {
            setProjectNameError(getErrorMessage(deleteError));
        } finally {
            setIsDeletingProject(false);
        }
    }, [project?.canManage, projectUrl, router]);

    const handleDeleteEnvFile = useCallback(async () => {
        const envFileId = envFileIdPendingDelete;

        if (!envFileId) {
            return;
        }

        if (!project?.canManage) {
            setEnvFileDeleteError(
                "Only project or workspace admins can delete env files."
            );
            return;
        }

        setIsDeletingEnvFile(true);

        try {
            await fetchJson<DeleteEnvFileResponse>(
                `${projectUrl}/env-files/${envFileId}`,
                {
                    method: "DELETE",
                }
            );

            setProject((currentProject) => {
                if (!currentProject) {
                    return currentProject;
                }

                const remainingEnvFiles = currentProject.envFiles.filter(
                    (envFile) => envFile.id !== envFileId
                );

                if (remainingEnvFiles.length === 0) {
                    setActiveEnvFileId(null);
                    setVariableDraftRows([]);
                    setSelectedDraftRowIds(new Set());
                    setRevealedVariableIds(new Set());
                } else if (activeEnvFileId === envFileId) {
                    const fallbackEnvFile = remainingEnvFiles[0];
                    setActiveEnvFileId(fallbackEnvFile.id);
                    setVariableDraftRows(
                        toVariableDraftRows(getPlainVariables(fallbackEnvFile.id))
                    );
                    setSelectedDraftRowIds(new Set());
                    setRevealedVariableIds(new Set());
                }

                return {
                    ...currentProject,
                    envFiles: remainingEnvFiles,
                };
            });

            if (renamingEnvFileId === envFileId) {
                cancelRenamingEnvFile();
            }

            setEnvFileDeleteError(null);
            setEnvFileIdPendingDelete(null);
        } catch (deleteError) {
            setEnvFileDeleteError(getErrorMessage(deleteError));
        } finally {
            setIsDeletingEnvFile(false);
        }
    }, [
        activeEnvFileId,
        cancelRenamingEnvFile,
        envFileIdPendingDelete,
        getPlainVariables,
        project?.canManage,
        projectUrl,
        renamingEnvFileId,
    ]);

    const activeEnvFile = useMemo(() => {
        if (!project) {
            return null;
        }

        return (
            project.envFiles.find((envFile) => envFile.id === activeEnvFileId) ??
            project.envFiles[0] ??
            null
        );
    }, [activeEnvFileId, project]);

    const effectiveProjectUpdatedAt = useMemo(() => {
        if (!project) {
            return null;
        }

        return (
            findMostRecentUpdatedAt(
                project,
                project.envFiles,
                project.envFiles.map((envFile) => envFile.variables)
            ) ?? new Date(project.updatedAt)
        ).toISOString();
    }, [project]);

    const effectiveActiveEnvFileUpdatedAt = useMemo(() => {
        if (!activeEnvFile) {
            return null;
        }

        return (
            findMostRecentUpdatedAt(activeEnvFile, activeEnvFile.variables) ??
            new Date(activeEnvFile.updatedAt)
        ).toISOString();
    }, [activeEnvFile]);

    const hasVariableDraftChanges = useMemo(() => {
        const baselineRows = activeEnvFile
            ? toVariableDraftRows(getPlainVariables(activeEnvFile.id))
            : [];

        return !areVariableDraftRowsEqual(variableDraftRows, baselineRows);
    }, [activeEnvFile, getPlainVariables, variableDraftRows]);

    const activeEnvironmentKey = useMemo(
        () =>
            activeEnvFile && project
                ? project.environmentKeys.find(
                    (environmentKey) => environmentKey.environment === activeEnvFile.environment
                ) ?? null
                : null,
        [activeEnvFile, project]
    );
    const activeEnvironmentStatus: EnvironmentKeyStatus = activeEnvFile
        ? environmentStatuses[activeEnvFile.environment] ?? { status: "awaiting" }
        : { status: "awaiting" };

    const variableSearchResult = useMemo(() => {
        const query = variableSearchQuery.trim();

        if (query.length === 0) {
            return {
                rows: variableDraftRows,
                error: null,
            };
        }

        try {
            const pattern = createVariableKeyPattern(query);

            if (!pattern) {
                const normalizedQuery = query.toLowerCase();

                return {
                    rows: variableDraftRows.filter((row) =>
                        row.key.toLowerCase().includes(normalizedQuery)
                    ),
                    error: null,
                };
            }

            return {
                rows: variableDraftRows.filter((row) => pattern.test(row.key)),
                error: null,
            };
        } catch {
            return {
                rows: variableDraftRows,
                error: "Invalid search pattern.",
            };
        }
    }, [variableDraftRows, variableSearchQuery]);
    const visibleVariableDraftRows = variableSearchResult.rows;
    const variableSearchError = variableSearchResult.error;
    const isVariableSearchActive = variableSearchQuery.trim().length > 0;

    const hasUnselectedDraftRows = useMemo(
        () =>
            visibleVariableDraftRows.some(
                (row) => !selectedDraftRowIds.has(row.clientId)
            ),
        [selectedDraftRowIds, visibleVariableDraftRows]
    );

    const hasCopyableVariables = useMemo(
        () => (activeEnvFile?.variableCount ?? 0) > 0,
        [activeEnvFile?.variableCount]
    );

    const handleCreateEnvFile = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (!project || !project.canManage) {
                setEnvFileError("Only project or workspace admins can create env files.");
                return;
            }

            const name = envFileName.trim();
            const description = envFileDescription.trim();

            if (name.length > 120) {
                setEnvFileError("Env file name must be 120 characters or less.");
                return;
            }

            if (description.length > 280) {
                setEnvFileError("Env file description must be 280 characters or less.");
                return;
            }

            setIsCreatingEnvFile(true);
            let createdKey: Awaited<ReturnType<typeof createEnvironmentKeyForSelf>> | null = null;

            try {
                const needsEnvironmentKey = !project.environmentKeys.some(
                    (environmentKey) => environmentKey.environment === envFileEnvironment
                );

                if (needsEnvironmentKey) {
                    if (!keys || !userId) {
                        throw new Error("Unlock your vault first.");
                    }

                    createdKey = await createEnvironmentKeyForSelf({
                        environment: envFileEnvironment,
                        keys,
                        userId,
                    });
                }

                const response = await fetchJson<CreateEnvFileResponse>(
                    `${projectUrl}/env-files`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            name: name || undefined,
                            environment: envFileEnvironment,
                            description: description || undefined,
                            environmentKey: createdKey
                                ? {
                                    id: createdKey.request.id,
                                    sealedSecret: createdKey.request.sealedSecret,
                                    signature: createdKey.request.signature,
                                }
                                : undefined,
                        }),
                    }
                );
                const responseKey = response.environmentKey;

                if (createdKey && responseKey?.id === createdKey.request.id) {
                    environmentKeyCacheRef.current.set(responseKey.id, {
                        version: responseKey.version,
                        material: createdKey.material,
                    });
                    createdKey = null;
                }

                setProject((currentProject) => {
                    if (!currentProject) {
                        return currentProject;
                    }

                    return {
                        ...currentProject,
                        envFiles: sortEnvFiles([
                            ...currentProject.envFiles,
                            response.envFile,
                        ]),
                        environmentKeys: responseKey
                            ? [
                                ...currentProject.environmentKeys.filter(
                                    (environmentKey) => environmentKey.id !== responseKey.id
                                ),
                                responseKey,
                            ]
                            : currentProject.environmentKeys,
                    };
                });
                setPlainVariablesByFileId((current) => ({
                    ...current,
                    [response.envFile.id]: [],
                }));

                if (responseKey && environmentKeyCacheRef.current.has(responseKey.id)) {
                    setEnvironmentStatuses((current) => ({
                        ...current,
                        [response.envFile.environment]: { status: "ready" },
                    }));
                }

                setActiveEnvFileId(response.envFile.id);
                setVariableDraftRows(toVariableDraftRows([]));
                setSelectedDraftRowIds(new Set());
                setRevealedVariableIds(new Set());
                setEnvFileName("");
                setEnvFileDescription("");
                setIsCreateEnvFileOpen(false);
                setEnvFileError(null);
            } catch (createError) {
                setEnvFileError(getErrorMessage(createError));
            } finally {
                if (createdKey) {
                    void wipeEnvironmentKey(createdKey.material);
                }

                setIsCreatingEnvFile(false);
            }
        },
        [
            envFileDescription,
            envFileEnvironment,
            envFileName,
            keys,
            project,
            projectUrl,
            userId,
        ]
    );

    const updateVariableDraftRow = useCallback(
        (
            clientId: string,
            field: "key" | "value" | "note" | "isNoteOpen" | "isCommented",
            value: string | boolean
        ) => {
            setVariableDraftRows((currentRows) =>
                currentRows.map((row) => {
                    if (row.clientId !== clientId) {
                        return row;
                    }

                    return {
                        ...row,
                        [field]: value,
                        ...(field === "value"
                            ? {
                                isValueEditable: true,
                            }
                            : {}),
                    };
                })
            );
            setVariableError(null);
        },
        []
    );

    const addVariableDraftRow = useCallback(() => {
        setVariableDraftRows((currentRows) => [
            ...currentRows,
            createEmptyDraftRow(),
        ]);
        setVariableError(null);
    }, []);

    const applyPastedVariables = useCallback((clientId: string, text: string) => {
        const parsedRows = parseEnvClipboardText(text);

        if (parsedRows.length === 0) {
            return false;
        }

        setVariableDraftRows((currentRows) => {
            const targetIndex = currentRows.findIndex((row) => row.clientId === clientId);
            const parsedDraftRows = parsedRows.map(createDraftRowFromParsedEnv);

            if (targetIndex === -1) {
                return [...currentRows, ...parsedDraftRows];
            }

            const targetRow = currentRows[targetIndex];
            const isTargetRowBlank =
                targetRow.key.trim().length === 0 &&
                targetRow.value.length === 0 &&
                targetRow.note.trim().length === 0;
            const insertionIndex = isTargetRowBlank ? targetIndex : targetIndex + 1;
            const rowsBeforeInsertion = currentRows.slice(0, insertionIndex);
            const rowsAfterInsertion = currentRows.slice(targetIndex + 1);

            return [
                ...rowsBeforeInsertion,
                ...parsedDraftRows,
                ...rowsAfterInsertion,
            ];
        });
        setSelectedDraftRowIds(new Set());
        setVariableError(null);

        return true;
    }, []);

    const toggleDraftRowSelection = useCallback((clientId: string) => {
        setSelectedDraftRowIds((currentIds) => {
            const nextIds = new Set(currentIds);

            if (nextIds.has(clientId)) {
                nextIds.delete(clientId);
            } else {
                nextIds.add(clientId);
            }

            return nextIds;
        });
    }, []);

    const selectAllDraftRows = useCallback(() => {
        setSelectedDraftRowIds((currentIds) => {
            const nextIds = new Set(currentIds);

            visibleVariableDraftRows.forEach((row) => {
                nextIds.add(row.clientId);
            });

            return nextIds;
        });
    }, [visibleVariableDraftRows]);

    const deselectAllDraftRows = useCallback(() => {
        setSelectedDraftRowIds(new Set());
    }, []);

    const deleteSelectedDraftRows = useCallback(() => {
        if (selectedDraftRowIds.size === 0) {
            return;
        }

        setVariableDraftRows((currentRows) =>
            currentRows.filter((row) => !selectedDraftRowIds.has(row.clientId))
        );
        setSelectedDraftRowIds(new Set());
        setVariableError(null);
    }, [selectedDraftRowIds]);

    const resetVariableDraftRows = useCallback(() => {
        setVariableDraftRows(
            activeEnvFile ? toVariableDraftRows(getPlainVariables(activeEnvFile.id)) : []
        );
        setSelectedDraftRowIds(new Set());
        setRevealedVariableIds(new Set());
        setVariableError(null);
    }, [activeEnvFile, getPlainVariables]);

    const handleCopyAllVariables = useCallback(async () => {
        if (!activeEnvFile) {
            setVariableError("Select an env file first.");
            return;
        }

        if (
            typeof navigator === "undefined" ||
            !navigator.clipboard?.writeText
        ) {
            setVariableError("Clipboard access is not available in this browser.");
            return;
        }

        if (!keys || !userId) {
            setVariableError("Unlock your vault first.");
            return;
        }

        setIsCopyingVariables(true);

        try {
            const response = await fetchJson<EnvVariablesCipherResponse>(
                `${projectUrl}/env-files/${activeEnvFile.id}/variables`
            );
            const material = await getEnvironmentKeyMaterial(
                response.environmentKey,
                keys,
                userId
            );

            if (!material) {
                setVariableError("You don't have this environment's key yet.");
                return;
            }

            const variables = await decryptEnvFileVariables({
                envFile: { ...activeEnvFile, variables: response.variables },
                material,
            });
            const clipboardPayload = buildEnvClipboardText(variables);

            if ("error" in clipboardPayload) {
                setVariableError(clipboardPayload.error);
                return;
            }

            await navigator.clipboard.writeText(clipboardPayload.text);
            setVariableError(null);
            setHasCopiedVariables(true);

            if (copyFeedbackTimeoutRef.current !== null) {
                window.clearTimeout(copyFeedbackTimeoutRef.current);
            }

            copyFeedbackTimeoutRef.current = window.setTimeout(() => {
                setHasCopiedVariables(false);
                copyFeedbackTimeoutRef.current = null;
            }, 1600);
        } catch (copyError) {
            setVariableError(
                copyError instanceof Error && copyError.message !== "Request failed."
                    ? copyError.message
                    : "Could not copy variables. Check browser clipboard permissions."
            );
        } finally {
            setIsCopyingVariables(false);
        }
    }, [activeEnvFile, getEnvironmentKeyMaterial, keys, projectUrl, userId]);

    const handleSaveVariables = useCallback(async () => {
        if (!activeEnvFile) {
            setVariableError("Select an env file first.");
            return;
        }

        if (!keys || !userId || !activeEnvironmentKey) {
            setVariableError("You don't have this environment's key yet.");
            return;
        }

        const plainVariables = [];
        const seenKeys = new Set<string>();

        for (const row of variableDraftRows) {
            const key = row.key.trim();
            const note = row.note.trim();
            const hasAnyValue =
                Boolean(row.variableId) ||
                key.length > 0 ||
                row.value.length > 0 ||
                note.length > 0;

            if (!hasAnyValue) {
                continue;
            }

            if (!envKeyPattern.test(key)) {
                setVariableError(
                    "Variable keys must start with a letter or underscore and contain only letters, numbers, and underscores."
                );
                return;
            }

            if (key.length > ENV_VARIABLE_KEY_MAX_LENGTH) {
                setVariableError(
                    `Variable keys must be ${ENV_VARIABLE_KEY_MAX_LENGTH} characters or less.`
                );
                return;
            }

            if (row.value.length > ENV_VARIABLE_VALUE_MAX_LENGTH) {
                setVariableError(
                    `Value for ${key} must be ${ENV_VARIABLE_VALUE_MAX_LENGTH.toLocaleString()} characters or less.`
                );
                return;
            }

            if (note.length > ENV_VARIABLE_NOTE_MAX_LENGTH) {
                setVariableError(
                    `Note for ${key} must be ${ENV_VARIABLE_NOTE_MAX_LENGTH} characters or less.`
                );
                return;
            }

            if (seenKeys.has(key)) {
                setVariableError(`Duplicate variable key: ${key}.`);
                return;
            }

            seenKeys.add(key);
            plainVariables.push({
                key,
                value: row.value,
                note: note || null,
                isCommented: row.isCommented,
            });
        }

        setIsSavingVariables(true);

        try {
            const material = await getEnvironmentKeyMaterial(activeEnvironmentKey, keys, userId);

            if (!material) {
                throw new Error("You don't have this environment's key yet.");
            }

            const encryptedVariables = await encryptEnvFileVariables({
                envFile: activeEnvFile,
                plainVariables,
                currentVariables: getPlainVariables(activeEnvFile.id),
                keyVersion: activeEnvironmentKey.version,
                material,
            });
            const response = await fetchJson<SaveEnvVariablesResponse>(
                `${projectUrl}/env-files/${activeEnvFile.id}/variables`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        variables: encryptedVariables,
                    }),
                }
            );
            const savedEnvFile = {
                ...activeEnvFile,
                variableCount: response.variables.length,
                variables: response.variables,
            };
            const savedPlainVariables = await decryptEnvFileVariables({
                envFile: savedEnvFile,
                material,
            });

            setProject((currentProject) => {
                if (!currentProject) {
                    return currentProject;
                }

                return {
                    ...currentProject,
                    envFiles: currentProject.envFiles.map((envFile) =>
                        envFile.id === activeEnvFile.id ? savedEnvFile : envFile
                    ),
                };
            });
            setPlainVariablesByFileId((current) => ({
                ...current,
                [activeEnvFile.id]: savedPlainVariables,
            }));
            setVariableDraftRows(toVariableDraftRows(savedPlainVariables));
            setSelectedDraftRowIds(new Set());
            setRevealedVariableIds(new Set());
            setVariableError(null);
        } catch (saveError) {
            setVariableError(getErrorMessage(saveError));
        } finally {
            setIsSavingVariables(false);
        }
    }, [
        activeEnvFile,
        activeEnvironmentKey,
        getEnvironmentKeyMaterial,
        getPlainVariables,
        keys,
        projectUrl,
        userId,
        variableDraftRows,
    ]);

    const toggleVariableVisibility = useCallback((row: VariableDraftRow) => {
        setRevealedVariableIds((currentIds) => {
            const nextIds = new Set(currentIds);

            if (nextIds.has(row.clientId)) {
                nextIds.delete(row.clientId);
            } else {
                nextIds.add(row.clientId);
            }

            return nextIds;
        });
    }, []);

    const startEditingVariableValue = useCallback((row: VariableDraftRow) => {
        setVariableDraftRows((currentRows) =>
            currentRows.map((currentRow) =>
                currentRow.clientId === row.clientId
                    ? {
                        ...currentRow,
                        isValueEditable: true,
                    }
                    : currentRow
            )
        );
        setRevealedVariableIds((currentIds) => {
            const nextIds = new Set(currentIds);
            nextIds.add(row.clientId);
            return nextIds;
        });
        setVariableError(null);
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
                <Skeleton className="h-8 w-64 shrink-0" />
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
                    <Skeleton className="min-h-0 flex-1 lg:h-full" />
                    <Skeleton className="min-h-0 flex-1 lg:h-full" />
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <section className="space-y-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/">
                        <ArrowLeft />
                        Projects
                    </Link>
                </Button>
                <div className="border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-200">
                    {error ?? "Project not found."}
                </div>
            </section>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
            <AlertDialog
                open={isDeleteProjectDialogOpen}
                onOpenChange={setIsDeleteProjectDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete project?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{project.name}</strong> and
                            all of its env files and variables.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingProject}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                void handleDeleteProject();
                            }}
                            disabled={isDeletingProject}
                        >
                            {isDeletingProject ? "Deleting..." : "Delete project"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={Boolean(envFileIdPendingDelete)}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setEnvFileIdPendingDelete(null);
                        setEnvFileDeleteError(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete env file?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the env file and all variables inside
                            it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {envFileDeleteError ? (
                        <p className="text-sm text-red-300">{envFileDeleteError}</p>
                    ) : null}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingEnvFile}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                void handleDeleteEnvFile();
                            }}
                            disabled={isDeletingEnvFile}
                        >
                            {isDeletingEnvFile ? "Deleting..." : "Delete env file"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <section className="shrink-0 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="mb-3">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/">
                                <ArrowLeft />
                                Projects
                            </Link>
                        </Button>
                    </div>
                    <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        Project environments
                    </p>
                    {isRenamingProject ? (
                        <form
                            className="mt-1 flex flex-wrap items-center gap-2"
                            onSubmit={(event) => {
                                void handleRenameProject(event);
                            }}
                        >
                            <input
                                autoFocus
                                value={projectDraftName}
                                onChange={(event) => {
                                    setProjectDraftName(event.target.value);
                                    setProjectNameError(null);
                                }}
                                maxLength={80}
                                placeholder="Project name"
                                className="h-9 w-72 max-w-full border border-border bg-background px-3 text-2xl font-semibold tracking-tight text-foreground outline-none focus:border-ring"
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSavingProjectName}
                            >
                                <Save />
                                {isSavingProjectName ? "Saving..." : "Save"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={cancelRenamingProject}
                                disabled={isSavingProjectName}
                            >
                                <X />
                                Cancel
                            </Button>
                        </form>
                    ) : (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
                                {project.name}
                            </h1>
                            {project.canManage ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon-xs"
                                            aria-label="Project actions"
                                            title="Project actions"
                                        >
                                            <MoreHorizontal />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onSelect={() => {
                                                startRenamingProject();
                                            }}
                                        >
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-red-300 focus:text-red-200"
                                            onSelect={() => {
                                                setIsDeleteProjectDialogOpen(true);
                                            }}
                                        >
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : null}
                        </div>
                    )}
                    {projectNameError ? (
                        <p className="mt-2 text-sm text-red-300">{projectNameError}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{project.envFiles.length} env files</span>
                        <span>
                            Updated{" "}
                            {formatTimeAgo(
                                effectiveProjectUpdatedAt ?? project.updatedAt
                            )}
                        </span>
                        {project.role ? <Badge variant="outline">{project.role}</Badge> : null}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            void refreshProject();
                        }}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
                        Refresh
                    </Button>
                </div>
            </section>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
                <section className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                    <div className="border border-border bg-card">
                        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                            <h2 className="text-base font-semibold text-foreground">
                                Environment files
                            </h2>
                            {project.canManage && !isCreateEnvFileOpen ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsCreateEnvFileOpen(true);
                                        setEnvFileError(null);
                                    }}
                                >
                                    <FilePlus2 />
                                    Add env file
                                </Button>
                            ) : null}
                        </div>
                        <div className="space-y-2 p-3">
                            {project.envFiles.length === 0 ? (
                                <p className="border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                                    No env files.
                                </p>
                            ) : (
                                project.envFiles.map((envFile) => {
                                    const isActive = activeEnvFile?.id === envFile.id;
                                    const isRenaming = renamingEnvFileId === envFile.id;

                                    if (isRenaming) {
                                        return (
                                            <form
                                                key={envFile.id}
                                                className="border border-border bg-background p-2"
                                                onSubmit={(event) => {
                                                    void handleRenameEnvFile(event, envFile.id);
                                                }}
                                            >
                                                <input
                                                    autoFocus
                                                    value={envFileDraftName}
                                                    onChange={(event) => {
                                                        setEnvFileDraftName(event.target.value);
                                                        setEnvFileNameRenameError(null);
                                                    }}
                                                    maxLength={120}
                                                    placeholder="Env file name"
                                                    className="h-8 w-full border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
                                                />
                                                <div className="mt-2 flex items-center gap-2">
                                                    <Button
                                                        type="submit"
                                                        size="sm"
                                                        disabled={isSavingEnvFileName}
                                                    >
                                                        <Save />
                                                        {isSavingEnvFileName ? "Saving..." : "Save"}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={cancelRenamingEnvFile}
                                                        disabled={isSavingEnvFileName}
                                                    >
                                                        <X />
                                                        Cancel
                                                    </Button>
                                                </div>
                                                {envFileNameRenameError ? (
                                                    <p className="mt-2 text-xs text-red-300">
                                                        {envFileNameRenameError}
                                                    </p>
                                                ) : null}
                                            </form>
                                        );
                                    }

                                    return (
                                        <div
                                            key={envFile.id}
                                            className={`group flex items-center justify-between gap-2 border px-3 py-2 transition ${isActive
                                                ? "border-foreground bg-foreground text-background"
                                                : "border-border bg-background text-foreground hover:bg-accent"
                                                }`}
                                        >
                                            <button
                                                type="button"
                                                className="min-w-0 flex-1 text-left"
                                                onClick={() => {
                                                    setActiveEnvFileId(envFile.id);
                                                    setVariableDraftRows(
                                                        toVariableDraftRows(
                                                            getPlainVariables(envFile.id)
                                                        )
                                                    );
                                                    setSelectedDraftRowIds(new Set());
                                                    setRevealedVariableIds(new Set());
                                                    setVariableError(null);
                                                }}
                                            >
                                                <span className="min-w-0">
                                                    <span className="flex items-center gap-2">
                                                        <span
                                                            className="size-2 shrink-0"
                                                            style={{
                                                                backgroundColor: getEnvironmentColor(
                                                                    envFile.environment
                                                                ),
                                                            }}
                                                            aria-hidden="true"
                                                        />
                                                        <span className="truncate text-sm font-medium">
                                                            {envFile.name}
                                                        </span>
                                                    </span>
                                                    <span className="mt-1 block text-xs opacity-70">
                                                        {environmentTypeLabels[envFile.environment]}
                                                    </span>
                                                </span>
                                            </button>
                                            <span className="flex shrink-0 items-center gap-2">
                                                <span className="text-xs opacity-70">
                                                    {envFile.variableCount}
                                                </span>
                                                {project.canManage ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon-xs"
                                                                aria-label={`Actions for ${envFile.name}`}
                                                                title="Env file actions"
                                                                className={isActive ? "border-background/40 text-background hover:bg-background/10 hover:text-background" : ""}
                                                            >
                                                                <MoreHorizontal />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onSelect={() => {
                                                                    startRenamingEnvFile(envFile);
                                                                }}
                                                            >
                                                                Rename
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-red-300 focus:text-red-200"
                                                                onSelect={() => {
                                                                    setEnvFileIdPendingDelete(
                                                                        envFile.id
                                                                    );
                                                                    setEnvFileDeleteError(null);
                                                                }}
                                                            >
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : null}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {project.canManage && isCreateEnvFileOpen ? (
                        <form
                            className="space-y-3 border border-border bg-card p-4"
                            onSubmit={(event) => {
                                void handleCreateEnvFile(event);
                            }}
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <FilePlus2 className="size-4" />
                                <h2>Add env file</h2>
                            </div>

                            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                Environment
                                <Select
                                    value={envFileEnvironment}
                                    onValueChange={(value) => {
                                        setEnvFileEnvironment(value as EnvironmentTypeValue);
                                    }}
                                >
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder="Select environment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {environmentTypes.map((environmentType) => (
                                            <SelectItem
                                                key={environmentType.key}
                                                value={environmentType.key}
                                            >
                                                {environmentType.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </label>

                            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                File name
                                <input
                                    value={envFileName}
                                    onChange={(event) => {
                                        setEnvFileName(event.target.value);
                                    }}
                                    placeholder={formatEnvironmentFileName(envFileEnvironment)}
                                    className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                />
                            </label>

                            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                                Description
                                <textarea
                                    value={envFileDescription}
                                    onChange={(event) => {
                                        setEnvFileDescription(event.target.value);
                                    }}
                                    className="mt-2 h-16 w-full resize-none border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                />
                            </label>

                            {envFileError ? (
                                <p className="text-sm text-red-300">{envFileError}</p>
                            ) : null}

                            <div className="flex flex-wrap items-center gap-2">
                                <Button type="submit" size="sm" disabled={isCreatingEnvFile}>
                                    {isCreatingEnvFile ? "Creating..." : "Create env file"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsCreateEnvFileOpen(false);
                                        setEnvFileError(null);
                                    }}
                                    disabled={isCreatingEnvFile}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    ) : null}
                </section>

                <section className="flex min-h-0 min-w-0 flex-1 flex-col border border-border bg-card">
                    {activeEnvFile ? (
                        <>
                            <div className="shrink-0 border-b border-border px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-xl font-semibold text-foreground">
                                            {activeEnvFile.name}
                                        </h2>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                            <Badge variant="outline">
                                                {environmentTypeLabels[activeEnvFile.environment]}
                                            </Badge>
                                            <span>
                                                {activeEnvFile.variableCount} variables
                                            </span>
                                            <span>
                                                Updated{" "}
                                                {formatTimeAgo(
                                                    effectiveActiveEnvFileUpdatedAt ??
                                                    activeEnvFile.updatedAt
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {activeEnvFile.description ? (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {activeEnvFile.description}
                                    </p>
                                ) : null}
                            </div>

                            {activeEnvironmentStatus.status !== "ready" ? (
                                <div className="p-4">
                                    <div className="flex max-w-xl gap-3 border border-border bg-background px-4 py-4">
                                        <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                        <div className="space-y-1 text-sm">
                                            <p className="font-medium text-foreground">
                                                {activeEnvironmentStatus.status === "error"
                                                    ? "This environment's key could not be opened"
                                                    : "Waiting for this environment's key"}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {activeEnvironmentStatus.status === "error"
                                                    ? activeEnvironmentStatus.message
                                                    : `You have permission for ${environmentTypeLabels[activeEnvFile.environment]}, but its values are end-to-end encrypted. Someone who already has access needs to share the key with you.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                                <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addVariableDraftRow}
                                        >
                                            <Plus />
                                            Add row
                                        </Button>
                                        {variableDraftRows.length > 0 && hasUnselectedDraftRows ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={selectAllDraftRows}
                                            >
                                                <SquareCheck />
                                                Select all
                                            </Button>
                                        ) : null}
                                        {selectedDraftRowIds.size > 0 ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={deselectAllDraftRows}
                                            >
                                                <X />
                                                Deselect all
                                            </Button>
                                        ) : null}
                                        {selectedDraftRowIds.size > 0 ? (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <Trash2 />
                                                        Delete selected
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            Delete selected rows?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will remove{" "}
                                                            {selectedDraftRowIds.size} selected{" "}
                                                            {selectedDraftRowIds.size === 1
                                                                ? "row"
                                                                : "rows"}{" "}
                                                            from the draft. The change is not saved until you save variables.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>
                                                            Cancel
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={deleteSelectedDraftRows}
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        ) : null}
                                        {hasVariableDraftChanges ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={resetVariableDraftRows}
                                            >
                                                <RotateCcw />
                                                Reset
                                            </Button>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                                        <div
                                            className="flex h-7 w-44 min-w-0 items-center gap-1.5 border border-border bg-background px-2"
                                        >
                                            <label className="sr-only" htmlFor="variable-key-search">
                                                Search env keys
                                            </label>
                                            <Search className="size-3.5 shrink-0 text-muted-foreground" />
                                            <input
                                                id="variable-key-search"
                                                value={variableSearchQuery}
                                                onChange={(event) => {
                                                    setVariableSearchQuery(event.target.value);
                                                }}
                                                placeholder="Search keys"
                                                aria-invalid={Boolean(variableSearchError)}
                                                title={variableSearchError ?? "Search env keys"}
                                                className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground"
                                            />
                                            {variableSearchError ? (
                                                <span className="shrink-0 text-[11px] text-red-300">
                                                    Invalid
                                                </span>
                                            ) : isVariableSearchActive ? (
                                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                                    {visibleVariableDraftRows.length}/
                                                    {variableDraftRows.length}
                                                </span>
                                            ) : null}
                                            {variableSearchQuery.length > 0 ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => setVariableSearchQuery("")}
                                                    aria-label="Clear env key search"
                                                    title="Clear env key search"
                                                >
                                                    <X />
                                                </Button>
                                            ) : null}
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                void handleCopyAllVariables();
                                            }}
                                            disabled={
                                                isCopyingVariables ||
                                                !hasCopyableVariables
                                            }
                                        >
                                            <Copy />
                                            {hasCopiedVariables
                                                ? "Copied"
                                                : isCopyingVariables
                                                    ? "Copying..."
                                                    : "Copy all"}
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                void handleSaveVariables();
                                            }}
                                            disabled={isSavingVariables || !hasVariableDraftChanges}
                                        >
                                            <Save />
                                            {isSavingVariables ? "Saving..." : "Save variables"}
                                        </Button>
                                    </div>
                                </div>

                                {variableError ? (
                                    <p className="shrink-0 border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                                        {variableError}
                                    </p>
                                ) : null}

                                <div className="min-h-0 flex-1 overflow-auto border border-border">
                                    <div className="min-w-[48rem] divide-y divide-border">
                                        <div className="sticky top-0 z-10 grid grid-cols-[2.5rem_14rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] gap-3 bg-muted px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">
                                            <span />
                                            <span>Key</span>
                                            <span>Value</span>
                                            <span />
                                            <span className="text-center">Note</span>
                                            <span className="text-center">#</span>
                                            <span />
                                        </div>

                                        {variableDraftRows.length === 0 ? (
                                            <p className="bg-background px-3 py-4 text-sm text-muted-foreground">
                                                No draft rows. Add a row, then save.
                                            </p>
                                        ) : visibleVariableDraftRows.length === 0 ? (
                                            <p className="bg-background px-3 py-4 text-sm text-muted-foreground">
                                                No env keys match the current search.
                                            </p>
                                        ) : (
                                            visibleVariableDraftRows.map((row) => {
                                                const isVisible = revealedVariableIds.has(
                                                    row.clientId
                                                );

                                                return (
                                                    <div
                                                        key={row.clientId}
                                                        className={
                                                            row.isCommented
                                                                ? "bg-muted/40"
                                                                : "bg-background"
                                                        }
                                                    >
                                                        <div className="grid grid-cols-[2.5rem_14rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] gap-3 px-3 py-3 text-sm">
                                                            <label className="grid place-items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedDraftRowIds.has(
                                                                        row.clientId
                                                                    )}
                                                                    onChange={() => {
                                                                        toggleDraftRowSelection(
                                                                            row.clientId
                                                                        );
                                                                    }}
                                                                    className="size-4"
                                                                    aria-label={`Select ${row.key || "draft row"}`}
                                                                />
                                                            </label>

                                                            <div className="relative min-w-0">
                                                            {row.isCommented ? (
                                                                <span className="pointer-events-none absolute inset-y-0 left-2 grid place-items-center font-mono text-sm text-muted-foreground">
                                                                    #
                                                                </span>
                                                            ) : null}
                                                            <input
                                                                value={row.key}
                                                                onChange={(event) => {
                                                                    updateVariableDraftRow(
                                                                        row.clientId,
                                                                        "key",
                                                                        event.target.value
                                                                    );
                                                                }}
                                                                onPaste={(event) => {
                                                                    if (
                                                                        applyPastedVariables(
                                                                            row.clientId,
                                                                            event.clipboardData.getData("text")
                                                                        )
                                                                    ) {
                                                                        event.preventDefault();
                                                                    }
                                                                }}
                                                                placeholder="DATABASE_URL"
                                                                className={`h-8 w-full min-w-0 border border-border bg-card px-2 font-mono text-sm outline-none focus:border-ring ${row.isCommented ? "pl-5 text-muted-foreground" : "text-foreground"}`}
                                                            />
                                                            </div>

                                                            <input
                                                                type={isVisible ? "text" : "password"}
                                                                value={row.value}
                                                                readOnly={!row.isValueEditable}
                                                                onChange={(event) => {
                                                                    if (!row.isValueEditable) {
                                                                        return;
                                                                    }

                                                                    updateVariableDraftRow(
                                                                        row.clientId,
                                                                        "value",
                                                                        event.target.value
                                                                    );
                                                                }}
                                                                onPaste={(event) => {
                                                                    if (!row.isValueEditable) {
                                                                        event.preventDefault();
                                                                        return;
                                                                    }

                                                                    if (
                                                                        applyPastedVariables(
                                                                            row.clientId,
                                                                            event.clipboardData.getData("text")
                                                                        )
                                                                    ) {
                                                                        event.preventDefault();
                                                                    }
                                                                }}
                                                                placeholder="postgres://..."
                                                                className="h-8 min-w-0 border border-border bg-card px-2 font-mono text-sm text-foreground outline-none read-only:text-muted-foreground focus:border-ring"
                                                            />

                                                            <div className="grid place-items-center">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon-xs"
                                                                    onClick={() => {
                                                                        startEditingVariableValue(row);
                                                                    }}
                                                                    disabled={row.isValueEditable}
                                                                    aria-label="Edit variable value"
                                                                    title="Edit variable value"
                                                                >
                                                                    <Pencil />
                                                                </Button>
                                                            </div>

                                                            <div className="grid place-items-center">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon-xs"
                                                                    onClick={() => {
                                                                        updateVariableDraftRow(
                                                                            row.clientId,
                                                                            "isNoteOpen",
                                                                            !row.isNoteOpen
                                                                        );
                                                                    }}
                                                                    aria-controls={`note-${row.clientId}`}
                                                                    aria-expanded={row.isNoteOpen}
                                                                    aria-label={row.isNoteOpen ? "Hide note" : row.note ? "Edit note" : "Add note"}
                                                                    title={row.isNoteOpen ? "Hide note" : row.note ? "Edit note" : "Add note"}
                                                                >
                                                                    {row.note ? (
                                                                        <StickyNote />
                                                                    ) : (
                                                                        <StickyNotePlus />
                                                                    )}
                                                                </Button>
                                                            </div>

                                                            <div className="grid place-items-center">
                                                                <Button
                                                                    type="button"
                                                                    variant={row.isCommented ? "secondary" : "outline"}
                                                                    size="icon-xs"
                                                                    onClick={() => {
                                                                        updateVariableDraftRow(
                                                                            row.clientId,
                                                                            "isCommented",
                                                                            !row.isCommented
                                                                        );
                                                                    }}
                                                                    aria-pressed={row.isCommented}
                                                                    aria-label={row.isCommented ? "Uncomment variable" : "Comment out variable"}
                                                                    title={row.isCommented ? "Uncomment variable" : "Comment out variable"}
                                                                >
                                                                    <Hash />
                                                                </Button>
                                                            </div>

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon-xs"
                                                                onClick={() => {
                                                                    toggleVariableVisibility(row);
                                                                }}
                                                                aria-label={
                                                                    isVisible
                                                                        ? "Hide variable value"
                                                                        : "Show variable value"
                                                                }
                                                            >
                                                                {isVisible ? <EyeOff /> : <Eye />}
                                                            </Button>
                                                        </div>

                                                        {row.isNoteOpen ? (
                                                            <div className="grid grid-cols-[2.5rem_14rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] gap-3 px-3 pb-3 text-sm">
                                                                <div className="col-start-2 col-span-6 min-w-0">
                                                                    <textarea
                                                                        id={`note-${row.clientId}`}
                                                                        rows={Math.max(1, row.note.split("\n").length)}
                                                                        value={row.note}
                                                                        onChange={(event) => {
                                                                            updateVariableDraftRow(
                                                                                row.clientId,
                                                                                "note",
                                                                                event.target.value
                                                                            );
                                                                        }}
                                                                        placeholder="Comment (saved as # lines above this variable)"
                                                                        className="block w-full min-w-0 resize-y border border-border bg-card px-2 py-1.5 font-mono text-xs leading-5 text-muted-foreground outline-none focus:border-ring focus:text-foreground"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                            )}
                        </>
                    ) : (
                        <div className="p-4 text-sm text-muted-foreground">
                            No env file selected.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
