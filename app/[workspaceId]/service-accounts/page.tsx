"use client";

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import NewTokenNotice from "@/components/service-accounts/new-token-notice";
import ServiceAccountCard from "@/components/service-accounts/service-account-card";
import ServiceAccountForm from "@/components/service-accounts/service-account-form";
import { useVault } from "@/contexts/vault";
import { useWorkspace } from "@/contexts/workspace";
import {
    createServiceAccountKeys,
    mintServiceAccountToken,
} from "@/lib/service-account-crypto";
import type {
    ServiceAccountDraftProject,
    ServiceAccountSummary,
    ServiceAccountsResponse,
} from "@/types/service-account";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;

    if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "Request failed.");
    }

    return payload;
}

export default function ServiceAccountsPage() {
    const params = useParams();
    const workspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] ?? "" : params.workspaceId ?? "";
    const { activeWorkspace } = useWorkspace();
    const { keys } = useVault();
    const [accounts, setAccounts] = useState<ServiceAccountSummary[] | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newToken, setNewToken] = useState<{ accountName: string; token: string } | null>(null);
    const baseUrl = `/api/workspaces/${workspaceId}/service-accounts`;

    const load = useCallback(async () => {
        try {
            const response = await requestJson<ServiceAccountsResponse>(baseUrl);
            setAccounts(response.serviceAccounts);
            setError(null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load service accounts.");
            setAccounts([]);
        }
    }, [baseUrl]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            void load();
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [load]);

    const run = async (task: () => Promise<void>) => {
        setIsBusy(true);
        setError(null);

        try {
            await task();
        } catch (taskError) {
            setError(taskError instanceof Error ? taskError.message : "Something went wrong.");
        } finally {
            setIsBusy(false);
        }
    };

    const createAccount = (input: { name: string; projects: ServiceAccountDraftProject[] }) =>
        run(async () => {
            if (!keys) {
                throw new Error("Unlock your vault first.");
            }

            const accountKeys = await createServiceAccountKeys(keys);
            await requestJson(baseUrl, {
                method: "POST",
                body: JSON.stringify({
                    name: input.name,
                    ...accountKeys,
                    projects: input.projects.map((project) => ({
                        projectId: project.projectId,
                        role: project.role,
                        environmentAccessScope: "SELECTED_ENVIRONMENTS",
                        environments: project.environments,
                    })),
                }),
            });
            await load();
        });

    const createToken = (account: ServiceAccountSummary, name: string, expiresInDays: number) =>
        run(async () => {
            if (!keys) {
                throw new Error("Unlock your vault first.");
            }

            const minted = await mintServiceAccountToken({ serviceAccount: account, holder: keys });
            await requestJson(`${baseUrl}/${account.id}/tokens`, {
                method: "POST",
                body: JSON.stringify({ name, expiresInDays, ...minted.request }),
            });
            setNewToken({ accountName: account.name, token: minted.fullToken });
            await load();
        });

    const revokeToken = (account: ServiceAccountSummary, tokenId: string) =>
        run(async () => {
            await requestJson(`${baseUrl}/${account.id}/tokens/${tokenId}`, { method: "DELETE" });
            await load();
        });

    const deleteAccount = (account: ServiceAccountSummary) =>
        run(async () => {
            await requestJson(`${baseUrl}/${account.id}`, { method: "DELETE" });
            await load();
        });

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-4 pb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Service accounts</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Give CI and servers their own end-to-end encrypted access to selected environments.
                    </p>
                </div>

                {newToken ? (
                    <NewTokenNotice
                        accountName={newToken.accountName}
                        token={newToken.token}
                        onDismiss={() => setNewToken(null)}
                    />
                ) : null}

                {error ? (
                    <p className="border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">{error}</p>
                ) : null}

                {accounts === null ? (
                    <div className="flex justify-center py-8 text-muted-foreground">
                        <Loader2 className="size-5 animate-spin" />
                    </div>
                ) : (
                    accounts.map((account) => (
                        <ServiceAccountCard
                            key={account.id}
                            account={account}
                            isBusy={isBusy}
                            onCreateToken={(target, name, days) => void createToken(target, name, days)}
                            onRevokeToken={(target, tokenId) => void revokeToken(target, tokenId)}
                            onDelete={(target) => void deleteAccount(target)}
                        />
                    ))
                )}

                <section className="border border-border bg-card">
                    <div className="border-b border-border px-4 py-3">
                        <h2 className="text-base font-semibold text-foreground">New service account</h2>
                    </div>
                    <div className="px-4 py-4">
                        <ServiceAccountForm
                            key={accounts?.length ?? 0}
                            workspaceId={workspaceId}
                            projects={activeWorkspace?.projects ?? []}
                            isPending={isBusy}
                            onSubmit={(input) => void createAccount(input)}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}
