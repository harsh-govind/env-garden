"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
    EnvironmentKeyAccess,
    EnvironmentKeyAccessResponse,
    PendingKeyRequestsNoticeProps,
} from "@/types/environment-key";

export default function PendingKeyRequestsNotice({ workspaceId }: PendingKeyRequestsNoticeProps) {
    const [keys, setKeys] = useState<EnvironmentKeyAccess[]>([]);

    useEffect(() => {
        const controller = new AbortController();

        fetch(`/api/workspaces/${workspaceId}/environment-keys`, {
            signal: controller.signal,
            cache: "no-store",
        })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload: EnvironmentKeyAccessResponse | null) => {
                setKeys(payload?.keys ?? []);
            })
            .catch(() => undefined);

        return () => controller.abort();
    }, [workspaceId]);

    const projects = useMemo(() => {
        const byProject = new Map<string, { name: string; waiting: number; rotation: boolean }>();

        for (const key of keys) {
            const waiting = key.pendingRecipients.length;
            const rotation = key.rotationRequired && key.canRotate;

            if (waiting === 0 && !rotation) {
                continue;
            }

            const current = byProject.get(key.projectId) ?? { name: key.projectName, waiting: 0, rotation: false };
            current.waiting += waiting;
            current.rotation ||= rotation;
            byProject.set(key.projectId, current);
        }

        return [...byProject.entries()];
    }, [keys]);

    if (projects.length === 0) {
        return null;
    }

    return (
        <section className="shrink-0 border border-border bg-card px-4 py-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <KeyRound className="size-4" />
                Environment keys need your attention
            </p>
            <ul className="mt-2 space-y-1 text-sm">
                {projects.map(([projectId, project]) => (
                    <li key={projectId}>
                        <Link
                            href={`/${workspaceId}/projects/${projectId}`}
                            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                            {project.name}
                        </Link>
                        <span className="text-muted-foreground">
                            {project.waiting > 0
                                ? ` · ${project.waiting} waiting for a key you hold`
                                : ""}
                            {project.rotation ? " · key rotation needed" : ""}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
