"use client";

import { Link2, Loader2, Mail, Unlink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ProviderIcon from "@/components/settings/provider-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AUTH_ERROR_MESSAGES,
    DEFAULT_AUTH_ERROR_MESSAGE,
    SOCIAL_PROVIDERS,
} from "@/constants/auth";
import { SETTINGS_ACCOUNT_PATH } from "@/constants/routes";
import { useAuthenticated } from "@/contexts/authenticated";
import { authClient } from "@/lib/auth-client";
import type { ConnectedAccountSummary, SocialProviderId } from "@/types/auth";
import { formatTimeAgo } from "@/utils";

async function fetchAccounts(): Promise<ConnectedAccountSummary[] | Error> {
    const { data, error } = await authClient.listAccounts();

    if (error || !data) {
        return new Error(error?.message ?? "Could not load connected accounts.");
    }

    return data.map((account) => ({
        id: account.id,
        providerId: account.providerId,
        accountId: account.accountId,
        createdAt: new Date(account.createdAt).toISOString(),
    }));
}

export default function AccountConnections() {
    const { user } = useAuthenticated();
    const searchParams = useSearchParams();
    const linkErrorCode = searchParams.get("error");
    const [accounts, setAccounts] = useState<ConnectedAccountSummary[] | null>(null);
    const [error, setError] = useState<string | null>(
        linkErrorCode ? AUTH_ERROR_MESSAGES[linkErrorCode] ?? DEFAULT_AUTH_ERROR_MESSAGE : null
    );
    const [pendingProvider, setPendingProvider] = useState<SocialProviderId | null>(null);

    const applyLoadResult = useCallback((result: ConnectedAccountSummary[] | Error) => {
        if (result instanceof Error) {
            setError(result.message);
            return;
        }

        setAccounts(result);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        void fetchAccounts().then((result) => {
            if (!isCancelled) {
                applyLoadResult(result);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [applyLoadResult]);

    const connect = async (provider: SocialProviderId) => {
        setPendingProvider(provider);
        setError(null);

        const { error: linkError } = await authClient.linkSocial({
            provider,
            callbackURL: SETTINGS_ACCOUNT_PATH,
            errorCallbackURL: SETTINGS_ACCOUNT_PATH,
        });

        if (linkError) {
            setError(linkError.message ?? "Could not start connecting the account.");
            setPendingProvider(null);
        }
    };

    const disconnect = async (account: ConnectedAccountSummary, provider: SocialProviderId) => {
        setPendingProvider(provider);
        setError(null);

        const { error: unlinkError } = await authClient.unlinkAccount({ accountId: account.id });

        if (unlinkError) {
            setError(unlinkError.message ?? "Could not disconnect the account.");
        } else {
            applyLoadResult(await fetchAccounts());
        }

        setPendingProvider(null);
    };

    return (
        <section className="border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Link2 className="size-4" />
                    Sign-in methods
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Connect Google or GitHub to sign in with them. Connected accounts must use the same
                    email address.
                </p>
            </div>

            <div className="space-y-3 px-4 py-4">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <ul className="divide-y divide-border border border-border">
                    <li className="flex items-center justify-between gap-4 px-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <Mail className="size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">Email</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    Magic link to {user?.email ?? "your email"}
                                </p>
                            </div>
                        </div>
                        <Badge variant="outline">Always on</Badge>
                    </li>

                    {SOCIAL_PROVIDERS.map((provider) => {
                        const account = accounts?.find((candidate) => candidate.providerId === provider.id);
                        const isPending = pendingProvider === provider.id;

                        return (
                            <li key={provider.id} className="flex items-center justify-between gap-4 px-3 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <ProviderIcon providerId={provider.id} className="size-4 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">{provider.label}</p>
                                        {accounts === null ? (
                                            <Skeleton className="mt-1 h-3 w-28" />
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                {account ? `Connected ${formatTimeAgo(account.createdAt)}` : "Not connected"}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {accounts === null ? (
                                    <Skeleton className="h-7 w-24" />
                                ) : account ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={pendingProvider !== null}
                                        onClick={() => {
                                            void disconnect(account, provider.id);
                                        }}
                                    >
                                        {isPending ? <Loader2 className="animate-spin" /> : <Unlink />}
                                        Disconnect
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={pendingProvider !== null}
                                        onClick={() => {
                                            void connect(provider.id);
                                        }}
                                    >
                                        {isPending ? <Loader2 className="animate-spin" /> : <Link2 />}
                                        Connect
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}
