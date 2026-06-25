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
    FilePlus2,
    Loader2,
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
import { useParams } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
    defaultProjectEnvironmentTypes,
    environmentTypeLabels,
    environmentTypes,
    formatEnvironmentFileName,
} from "@/lib/constants";
import { findMostRecentUpdatedAt } from "@/lib/updated-at";
import { formatTimeAgo } from "@/lib/utils";
import type {
    CreateEnvFileResponse,
    EnvVariableValueResponse,
    EnvVariablesValueResponse,
    ParsedEnvRow,
    ProjectDetail,
    ProjectDetailResponse,
    ProjectEnvFile,
    ProjectEnvVariable,
    SaveEnvVariablesResponse,
    VariableDraftRow,
} from "@/types/project";
import type { ApiErrorPayload, EnvironmentTypeValue } from "@/types/workspace";

const environmentOrder = new Map(
    environmentTypes.map((environmentType, index) => [
        environmentType.key,
        index,
    ])
);
const envKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const hiddenValueMask = "*****";

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

function toVariableDraftRows(variables: ProjectEnvVariable[]): VariableDraftRow[] {
    const rows = variables.map((variable) => ({
        clientId: variable.id,
        variableId: variable.id,
        key: variable.key,
        value: variable.value ?? "",
        originalValue: variable.value ?? "",
        isValueLoaded: typeof variable.value === "string",
        isValueEditable: false,
        note: variable.note ?? "",
        isNoteOpen: Boolean(variable.note),
    }));

    return rows.length > 0 ? rows : [createEmptyDraftRow()];
}

function createEmptyDraftRow(): VariableDraftRow {
    return {
        clientId: createDraftClientId(),
        key: "",
        value: "",
        originalValue: "",
        isValueLoaded: true,
        isValueEditable: true,
        note: "",
        isNoteOpen: false,
    };
}

function trimEnvValue(value: string) {
    const trimmedValue = value.trim();
    const firstCharacter = trimmedValue[0];
    const lastCharacter = trimmedValue[trimmedValue.length - 1];

    if (
        trimmedValue.length >= 2 &&
        ((firstCharacter === '"' && lastCharacter === '"') ||
            (firstCharacter === "'" && lastCharacter === "'"))
    ) {
        return trimmedValue.slice(1, -1);
    }

    return trimmedValue;
}

function parseEnvClipboardText(text: string): ParsedEnvRow[] {
    return text
        .split(/\r?\n/)
        .map((rawLine) => rawLine.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .map((line) =>
            line.startsWith("export ") ? line.slice("export ".length).trimStart() : line
        )
        .reduce<ParsedEnvRow[]>((parsedRows, line) => {
            const separatorIndex = line.indexOf("=");

            if (separatorIndex <= 0) {
                return parsedRows;
            }

            const key = line.slice(0, separatorIndex).trim();

            if (!envKeyPattern.test(key)) {
                return parsedRows;
            }

            parsedRows.push({
                key,
                value: trimEnvValue(line.slice(separatorIndex + 1)),
                note: "",
            });

            return parsedRows;
        }, []);
}

function createDraftRowFromParsedEnv(parsedRow: ParsedEnvRow): VariableDraftRow {
    return {
        clientId: createDraftClientId(),
        key: parsedRow.key,
        value: parsedRow.value,
        originalValue: "",
        isValueLoaded: true,
        isValueEditable: true,
        note: parsedRow.note,
        isNoteOpen: Boolean(parsedRow.note),
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
            (!currentRow.isValueLoaded ||
                currentRow.value === currentRow.originalValue)
        );
    });
}

function formatEnvValueForClipboard(value: string) {
    if (value.length === 0 || !/[\s#"'\\\r\n]/.test(value)) {
        return value;
    }

    return JSON.stringify(value);
}

function buildEnvClipboardText(
    rows: {
        key: string;
        value: string;
        note?: string | null;
    }[]
): { text: string } | { error: string } {
    const lines: string[] = [];
    const seenKeys = new Set<string>();

    for (const row of rows) {
        const key = row.key.trim();
        const note = row.note?.trim() ?? "";
        const hasAnyValue =
            key.length > 0 ||
            row.value.length > 0 ||
            note.length > 0;

        if (!hasAnyValue) {
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
        lines.push(`${key}=${formatEnvValueForClipboard(row.value)}`);
    }

    if (lines.length === 0) {
        return {
            error: "Add at least one variable to copy.",
        };
    }

    return {
        text: lines.join("\n"),
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
    const workspaceId = getRouteParam(params.workspaceId);
    const projectId = getRouteParam(params.projectId);

    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [activeEnvFileId, setActiveEnvFileId] = useState<string | null>(null);
    const [revealedVariableIds, setRevealedVariableIds] = useState<Set<string>>(
        () => new Set()
    );
    const [loadingVariableValueIds, setLoadingVariableValueIds] = useState<Set<string>>(
        () => new Set()
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [envFileEnvironment, setEnvFileEnvironment] =
        useState<EnvironmentTypeValue>(defaultProjectEnvironmentTypes[0]);
    const [envFileName, setEnvFileName] = useState("");
    const [envFileDescription, setEnvFileDescription] = useState("");
    const [isCreateEnvFileOpen, setIsCreateEnvFileOpen] = useState(false);
    const [isCreatingEnvFile, setIsCreatingEnvFile] = useState(false);
    const [envFileError, setEnvFileError] = useState<string | null>(null);

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
            .then((response) => {
                if (!isCurrent) {
                    return;
                }

                setProject(response.project);
                const firstEnvFile = response.project.envFiles[0] ?? null;
                setActiveEnvFileId(firstEnvFile?.id ?? null);
                setVariableDraftRows(
                    firstEnvFile ? toVariableDraftRows(firstEnvFile.variables) : []
                );
                setSelectedDraftRowIds(new Set());
                setRevealedVariableIds(new Set());
                setLoadingVariableValueIds(new Set());
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
    }, [requestProject]);

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
            const nextActiveEnvFile =
                (activeEnvFileId
                    ? response.project.envFiles.find(
                        (envFile) => envFile.id === activeEnvFileId
                    )
                    : null) ??
                response.project.envFiles[0] ??
                null;

            setProject(response.project);
            setActiveEnvFileId(nextActiveEnvFile?.id ?? null);
            setVariableDraftRows(
                nextActiveEnvFile
                    ? toVariableDraftRows(nextActiveEnvFile.variables)
                    : []
            );
            setSelectedDraftRowIds(new Set());
            setRevealedVariableIds(new Set());
            setLoadingVariableValueIds(new Set());
            setError(null);
        } catch (refreshError) {
            setError(getErrorMessage(refreshError));
        } finally {
            setIsRefreshing(false);
        }
    }, [activeEnvFileId, requestProject]);

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
            ? toVariableDraftRows(activeEnvFile.variables)
            : [];

        return !areVariableDraftRowsEqual(variableDraftRows, baselineRows);
    }, [activeEnvFile, variableDraftRows]);

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

            if (!project?.canManage) {
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

            try {
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
                        }),
                    }
                );

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
                    };
                });
                setActiveEnvFileId(response.envFile.id);
                setVariableDraftRows(toVariableDraftRows(response.envFile.variables));
                setSelectedDraftRowIds(new Set());
                setRevealedVariableIds(new Set());
                setLoadingVariableValueIds(new Set());
                setEnvFileName("");
                setEnvFileDescription("");
                setIsCreateEnvFileOpen(false);
                setEnvFileError(null);
            } catch (createError) {
                setEnvFileError(getErrorMessage(createError));
            } finally {
                setIsCreatingEnvFile(false);
            }
        },
        [
            envFileDescription,
            envFileEnvironment,
            envFileName,
            project?.canManage,
            projectUrl,
        ]
    );

    const updateVariableDraftRow = useCallback(
        (
            clientId: string,
            field: "key" | "value" | "note" | "isNoteOpen",
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
                                isValueLoaded: true,
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
            activeEnvFile ? toVariableDraftRows(activeEnvFile.variables) : []
        );
        setSelectedDraftRowIds(new Set());
        setRevealedVariableIds(new Set());
        setLoadingVariableValueIds(new Set());
        setVariableError(null);
    }, [activeEnvFile]);

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

        setIsCopyingVariables(true);

        try {
            const response = await fetchJson<EnvVariablesValueResponse>(
                `${projectUrl}/env-files/${activeEnvFile.id}/variables`
            );
            const clipboardPayload = buildEnvClipboardText(response.variables);

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
        } catch {
            setVariableError(
                "Could not copy variables. Check browser clipboard permissions."
            );
        } finally {
            setIsCopyingVariables(false);
        }
    }, [activeEnvFile, projectUrl]);

    const handleSaveVariables = useCallback(async () => {
            if (!activeEnvFile) {
                setVariableError("Select an env file first.");
                return;
            }

            const variables = [];
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

                if (key.length > 120) {
                    setVariableError("Variable keys must be 120 characters or less.");
                    return;
                }

                if (row.isValueLoaded && row.value.length > 10000) {
                    setVariableError(`Value for ${key} must be 10,000 characters or less.`);
                    return;
                }

                if (note.length > 280) {
                    setVariableError(`Note for ${key} must be 280 characters or less.`);
                    return;
                }

                if (seenKeys.has(key)) {
                    setVariableError(`Duplicate variable key: ${key}.`);
                    return;
                }

                seenKeys.add(key);
                const shouldSendValue =
                    !row.variableId || row.value !== row.originalValue;

                if (!row.variableId && !row.isValueLoaded) {
                    setVariableError(`Value is required for ${key}.`);
                    return;
                }

                variables.push({
                    id: row.variableId,
                    key,
                    ...(shouldSendValue
                        ? {
                            value: row.value,
                        }
                        : {}),
                    note: note || null,
                });
            }

            setIsSavingVariables(true);

            try {
                const response = await fetchJson<SaveEnvVariablesResponse>(
                    `${projectUrl}/env-files/${activeEnvFile.id}/variables`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            variables,
                        }),
                    }
                );

                setProject((currentProject) => {
                    if (!currentProject) {
                        return currentProject;
                    }

                    return {
                        ...currentProject,
                        envFiles: currentProject.envFiles.map((envFile) => {
                            if (envFile.id !== activeEnvFile.id) {
                                return envFile;
                            }

                            return {
                                ...envFile,
                                variableCount: response.variables.length,
                                variables: response.variables,
                            };
                        }),
                    };
                });
                setVariableDraftRows(toVariableDraftRows(response.variables));
                setSelectedDraftRowIds(new Set());
                setRevealedVariableIds(new Set());
                setLoadingVariableValueIds(new Set());
                setVariableError(null);
            } catch (createError) {
                setVariableError(getErrorMessage(createError));
            } finally {
                setIsSavingVariables(false);
            }
        },
        [
            activeEnvFile,
            projectUrl,
            variableDraftRows,
        ]
    );

    const loadVariableValue = useCallback(
        async (row: VariableDraftRow) => {
            if (row.isValueLoaded || !row.variableId) {
                return row.value;
            }

            if (!activeEnvFile) {
                throw new Error("Select an env file first.");
            }

            setLoadingVariableValueIds((currentIds) => {
                const nextIds = new Set(currentIds);
                nextIds.add(row.clientId);
                return nextIds;
            });

            try {
                const response = await fetchJson<EnvVariableValueResponse>(
                    `${projectUrl}/env-files/${activeEnvFile.id}/variables?variableId=${encodeURIComponent(row.variableId)}`
                );
                const value = response.variable.value;

                setVariableDraftRows((currentRows) =>
                    currentRows.map((currentRow) =>
                        currentRow.clientId === row.clientId
                            ? {
                                ...currentRow,
                                value,
                                originalValue: value,
                                isValueLoaded: true,
                            }
                            : currentRow
                    )
                );
                setVariableError(null);

                return value;
            } finally {
                setLoadingVariableValueIds((currentIds) => {
                    const nextIds = new Set(currentIds);
                    nextIds.delete(row.clientId);
                    return nextIds;
                });
            }
        },
        [activeEnvFile, projectUrl]
    );

    const toggleVariableVisibility = useCallback(
        async (row: VariableDraftRow) => {
            if (revealedVariableIds.has(row.clientId)) {
                setRevealedVariableIds((currentIds) => {
                    const nextIds = new Set(currentIds);
                    nextIds.delete(row.clientId);
                    return nextIds;
                });
                return;
            }

            try {
                await loadVariableValue(row);
                setRevealedVariableIds((currentIds) => {
                    const nextIds = new Set(currentIds);
                    nextIds.add(row.clientId);
                    return nextIds;
                });
            } catch (loadValueError) {
                setVariableError(getErrorMessage(loadValueError));
            }
        },
        [loadVariableValue, revealedVariableIds]
    );

    const startEditingVariableValue = useCallback(
        async (row: VariableDraftRow) => {
            try {
                await loadVariableValue(row);
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
            } catch (loadValueError) {
                setVariableError(getErrorMessage(loadValueError));
            }
        },
        [loadVariableValue]
    );

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
                    <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-foreground">
                        {project.name}
                    </h1>
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

                                    return (
                                        <button
                                            key={envFile.id}
                                            type="button"
                                            className={`flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition ${isActive
                                                ? "border-foreground bg-foreground text-background"
                                                : "border-border bg-background text-foreground hover:bg-accent"
                                                }`}
                                            onClick={() => {
                                                setActiveEnvFileId(envFile.id);
                                                setVariableDraftRows(
                                                    toVariableDraftRows(envFile.variables)
                                                );
                                                setSelectedDraftRowIds(new Set());
                                                setRevealedVariableIds(new Set());
                                                setLoadingVariableValueIds(new Set());
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
                                            <span className="shrink-0 text-xs opacity-70">
                                                {envFile.variableCount}
                                            </span>
                                        </button>
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
                                <select
                                    value={envFileEnvironment}
                                    onChange={(event) => {
                                        setEnvFileEnvironment(
                                            event.target.value as EnvironmentTypeValue
                                        );
                                    }}
                                    className="mt-2 h-8 w-full border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
                                >
                                    {environmentTypes.map((environmentType) => (
                                        <option
                                            key={environmentType.key}
                                            value={environmentType.key}
                                        >
                                            {environmentType.label}
                                        </option>
                                    ))}
                                </select>
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
                                        <div className="sticky top-0 z-10 grid grid-cols-[2.5rem_14rem_1fr_2.5rem_2.5rem_2.5rem] gap-3 bg-muted px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">
                                            <span />
                                            <span>Key</span>
                                            <span>Value</span>
                                            <span />
                                            <span className="text-center">Note</span>
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
                                                const isLoadingValue =
                                                    loadingVariableValueIds.has(row.clientId);
                                                const displayedValue = row.isValueLoaded
                                                    ? row.value
                                                    : hiddenValueMask;

                                                return (
                                                    <div
                                                        key={row.clientId}
                                                        className="bg-background"
                                                    >
                                                        <div className="grid grid-cols-[2.5rem_14rem_1fr_2.5rem_2.5rem_2.5rem] gap-3 px-3 py-3 text-sm">
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
                                                                className="h-8 min-w-0 border border-border bg-card px-2 font-mono text-sm text-foreground outline-none focus:border-ring"
                                                            />

                                                            <input
                                                                type={
                                                                    row.isValueLoaded && !isVisible
                                                                        ? "password"
                                                                        : "text"
                                                                }
                                                                value={displayedValue}
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
                                                                        void startEditingVariableValue(row);
                                                                    }}
                                                                    disabled={
                                                                        isLoadingValue ||
                                                                        row.isValueEditable
                                                                    }
                                                                    aria-label="Edit variable value"
                                                                    title="Edit variable value"
                                                                >
                                                                    {isLoadingValue ? (
                                                                        <Loader2 className="animate-spin" />
                                                                    ) : (
                                                                        <Pencil />
                                                                    )}
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

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon-xs"
                                                                onClick={() => {
                                                                    void toggleVariableVisibility(row);
                                                                }}
                                                                disabled={isLoadingValue}
                                                                aria-label={
                                                                    isVisible
                                                                        ? "Hide variable value"
                                                                        : row.isValueLoaded
                                                                            ? "Show variable value"
                                                                            : "Load and show variable value"
                                                                }
                                                            >
                                                                {isLoadingValue ? (
                                                                    <Loader2 className="animate-spin" />
                                                                ) : isVisible ? (
                                                                    <EyeOff />
                                                                ) : (
                                                                    <Eye />
                                                                )}
                                                            </Button>
                                                        </div>

                                                        {row.isNoteOpen ? (
                                                            <div className="grid grid-cols-[2.5rem_14rem_1fr_2.5rem_2.5rem_2.5rem] gap-3 px-3 pb-3 text-sm">
                                                                <div className="col-start-2 col-span-5 min-w-0">
                                                                    <input
                                                                        id={`note-${row.clientId}`}
                                                                        value={row.note}
                                                                        onChange={(event) => {
                                                                            updateVariableDraftRow(
                                                                                row.clientId,
                                                                                "note",
                                                                                event.target.value
                                                                            );
                                                                        }}
                                                                        placeholder="Note"
                                                                        className="h-8 w-full min-w-0 border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-ring"
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
