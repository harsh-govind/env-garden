"use client";

import { Loader2, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { environmentTypeLabels } from "@/constants/environment";
import { SERVICE_ACCOUNT_NAME_MAX_LENGTH } from "@/constants/service-account";
import type { ProjectDetailResponse } from "@/types/project";
import type {
    ServiceAccountDraftProject,
    ServiceAccountFormProps,
} from "@/types/service-account";
import type { EnvironmentTypeValue } from "@/types/workspace";

const inputClassName =
    "mt-1 block h-9 w-full border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50";

export default function ServiceAccountForm({
    workspaceId,
    projects,
    isPending,
    onSubmit,
}: ServiceAccountFormProps) {
    const [name, setName] = useState("");
    const [drafts, setDrafts] = useState<Record<string, ServiceAccountDraftProject>>({});
    const [environmentsByProject, setEnvironmentsByProject] = useState<
        Record<string, EnvironmentTypeValue[]>
    >({});
    const [error, setError] = useState<string | null>(null);

    const toggleProject = async (projectId: string) => {
        if (drafts[projectId]) {
            setDrafts((current) => {
                const next = { ...current };
                delete next[projectId];
                return next;
            });
            return;
        }

        setDrafts((current) => ({
            ...current,
            [projectId]: { projectId, role: "VIEWER", environments: [] },
        }));

        if (environmentsByProject[projectId]) {
            return;
        }

        const response = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}`);
        const payload = (await response.json().catch(() => null)) as ProjectDetailResponse | null;
        const environments = [
            ...new Set(payload?.project.envFiles.map((envFile) => envFile.environment) ?? []),
        ];
        setEnvironmentsByProject((current) => ({ ...current, [projectId]: environments }));
    };

    const toggleEnvironment = (projectId: string, environment: EnvironmentTypeValue) => {
        setDrafts((current) => {
            const draft = current[projectId];

            if (!draft) {
                return current;
            }

            const environments = draft.environments.includes(environment)
                ? draft.environments.filter((candidate) => candidate !== environment)
                : [...draft.environments, environment];

            return { ...current, [projectId]: { ...draft, environments } };
        });
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const selected = Object.values(drafts);

        if (name.trim().length < 2) {
            setError("Give the service account a name.");
            return;
        }

        if (selected.length === 0 || selected.some((draft) => draft.environments.length === 0)) {
            setError("Pick at least one environment for each selected project.");
            return;
        }

        setError(null);
        onSubmit({ name: name.trim(), projects: selected });
    };

    return (
        <form className="space-y-4" onSubmit={submit}>
            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                Name
                <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={SERVICE_ACCOUNT_NAME_MAX_LENGTH}
                    placeholder="GitHub Actions deploy"
                    className={inputClassName}
                />
            </label>

            <div className="space-y-2">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">Access</p>
                {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Create a project first.</p>
                ) : (
                    projects.map((project) => {
                        const draft = drafts[project.id];
                        const environments = environmentsByProject[project.id];

                        return (
                            <div key={project.id} className="border border-border bg-background px-3 py-2">
                                <label className="flex items-center gap-2 text-sm text-foreground">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(draft)}
                                        onChange={() => void toggleProject(project.id)}
                                        className="size-4"
                                    />
                                    {project.name}
                                </label>
                                {draft ? (
                                    <div className="mt-2 space-y-2 pl-6">
                                        <div className="flex flex-wrap gap-1.5">
                                            {environments === undefined ? (
                                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                            ) : environments.length === 0 ? (
                                                <span className="text-xs text-muted-foreground">No environments yet.</span>
                                            ) : (
                                                environments.map((environment) => {
                                                    const isSelected = draft.environments.includes(environment);

                                                    return (
                                                        <button
                                                            key={environment}
                                                            type="button"
                                                            aria-pressed={isSelected}
                                                            onClick={() => toggleEnvironment(project.id, environment)}
                                                            className={`border px-2 py-0.5 text-xs ${isSelected ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
                                                        >
                                                            {environmentTypeLabels[environment]}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <input
                                                type="checkbox"
                                                checked={draft.role === "CONTRIBUTOR"}
                                                onChange={(event) =>
                                                    setDrafts((current) => ({
                                                        ...current,
                                                        [project.id]: {
                                                            ...draft,
                                                            role: event.target.checked ? "CONTRIBUTOR" : "VIEWER",
                                                        },
                                                    }))
                                                }
                                                className="size-3.5"
                                            />
                                            Can push changes (otherwise read-only)
                                        </label>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })
                )}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" size="lg" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                Create service account
            </Button>
        </form>
    );
}
