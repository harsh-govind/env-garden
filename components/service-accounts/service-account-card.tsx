"use client";

import { Bot, KeyRound, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { environmentTypeLabels } from "@/constants/environment";
import {
    SERVICE_ACCOUNT_DEFAULT_TOKEN_TTL_DAYS,
    SERVICE_ACCOUNT_TOKEN_TTL_DAYS,
} from "@/constants/service-account";
import { computeFingerprint } from "@/lib/crypto/keyring";
import { formatTimeAgo } from "@/utils";
import type { ServiceAccountCardProps } from "@/types/service-account";

export default function ServiceAccountCard({
    account,
    isBusy,
    onCreateToken,
    onRevokeToken,
    onDelete,
}: ServiceAccountCardProps) {
    const [fingerprint, setFingerprint] = useState<string | null>(null);
    const [tokenName, setTokenName] = useState("");
    const [expiresInDays, setExpiresInDays] = useState<number>(SERVICE_ACCOUNT_DEFAULT_TOKEN_TTL_DAYS);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        void computeFingerprint(account).then((value) => {
            if (isCurrent) {
                setFingerprint(value);
            }
        });

        return () => {
            isCurrent = false;
        };
    }, [account]);

    const submitToken = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onCreateToken(account, tokenName.trim() || "CI", expiresInDays);
        setTokenName("");
    };

    return (
        <section className="border border-border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                    <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
                        <Bot className="size-4" />
                        {account.name}
                    </h2>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{fingerprint ?? "…"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Created {formatTimeAgo(account.createdAt)}
                        {account.createdByEmail ? ` by ${account.createdByEmail}` : ""}
                    </p>
                </div>
                {isConfirmingDelete ? (
                    <div className="flex items-center gap-2">
                        <Button type="button" size="sm" variant="destructive" disabled={isBusy} onClick={() => onDelete(account)}>
                            Delete for good
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setIsConfirmingDelete(false)}>
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => setIsConfirmingDelete(true)}>
                        <Trash2 />
                        Delete
                    </Button>
                )}
            </div>

            <div className="space-y-4 px-4 py-4">
                <div>
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">Access</p>
                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                        {account.projects.map((project) => (
                            <li key={project.projectId}>
                                {project.projectName}
                                <span className="text-muted-foreground">
                                    {" · "}
                                    {project.environmentAccessScope === "ALL_ENVIRONMENTS"
                                        ? "all environments"
                                        : project.environments.map((environment) => environmentTypeLabels[environment]).join(", ")}
                                    {" · "}
                                    {project.role === "CONTRIBUTOR" ? "read and push" : "read-only"}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Values stay encrypted until someone who holds an environment&apos;s key shares it with this
                        service account from the project page.
                    </p>
                </div>

                <div>
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">Tokens</p>
                    {account.tokens.length === 0 ? (
                        <p className="mt-1 text-sm text-muted-foreground">No active tokens.</p>
                    ) : (
                        <ul className="mt-1 space-y-1.5">
                            {account.tokens.map((token) => (
                                <li
                                    key={token.id}
                                    className="flex flex-wrap items-center justify-between gap-2 border border-border bg-background px-3 py-2 text-sm"
                                >
                                    <span>
                                        {token.name}{" "}
                                        <span className="font-mono text-xs text-muted-foreground">{token.tokenPrefix}…</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {token.lastUsedAt ? `Used ${formatTimeAgo(token.lastUsedAt)}` : "Never used"}
                                            {token.expiresAt ? ` · expires ${new Date(token.expiresAt).toLocaleDateString()}` : ""}
                                        </span>
                                    </span>
                                    <Button
                                        type="button"
                                        size="xs"
                                        variant="outline"
                                        disabled={isBusy}
                                        onClick={() => onRevokeToken(account, token.id)}
                                    >
                                        Revoke
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {account.sealedSeed ? (
                    <form className="flex flex-wrap items-end gap-2" onSubmit={submitToken}>
                        <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                            Token name
                            <input
                                value={tokenName}
                                onChange={(event) => setTokenName(event.target.value)}
                                placeholder="CI"
                                className="mt-1 block h-8 w-44 border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
                            />
                        </label>
                        <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                            Expires in
                            <select
                                value={expiresInDays}
                                onChange={(event) => setExpiresInDays(Number(event.target.value))}
                                className="mt-1 block h-8 border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
                            >
                                {SERVICE_ACCOUNT_TOKEN_TTL_DAYS.map((days) => (
                                    <option key={days} value={days}>
                                        {days} days
                                    </option>
                                ))}
                            </select>
                        </label>
                        <Button type="submit" size="sm" disabled={isBusy}>
                            <KeyRound />
                            New token
                        </Button>
                    </form>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Only the person who created this service account can issue tokens for it.
                    </p>
                )}
            </div>
        </section>
    );
}
