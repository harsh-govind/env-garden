"use client";

import { KeyRound, Lock } from "lucide-react";
import { useState } from "react";
import PassphraseForm from "@/components/vault/passphrase-form";
import RecoveryPhraseGrid from "@/components/vault/recovery-phrase-grid";
import VaultSetup from "@/components/vault/vault-setup";
import { Button } from "@/components/ui/button";
import { useAuthenticated } from "@/contexts/authenticated";
import { useVault } from "@/contexts/vault";
import { decryptKeyring, seedToRecoveryPhrase, wipeAccountKeys } from "@/lib/crypto/keyring";
import type { EncryptionSettingsAction } from "@/types/settings";

export default function EncryptionSettings() {
    const { user } = useAuthenticated();
    const { keyring, fingerprint, changePassphrase, lock } = useVault();
    const [action, setAction] = useState<EncryptionSettingsAction>("idle");
    const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const close = () => {
        setAction("idle");
        setRecoveryPhrase(null);
        setError(null);
    };

    const run = async (task: () => Promise<void>) => {
        setIsPending(true);
        setError(null);
        setNotice(null);

        try {
            await task();
        } catch (taskError) {
            setError(taskError instanceof Error ? taskError.message : "Something went wrong.");
        } finally {
            setIsPending(false);
        }
    };

    const revealPhrase = (passphrase: string) =>
        run(async () => {
            if (!user || !keyring) {
                throw new Error("Unlock first.");
            }

            const keys = await decryptKeyring({ userId: user.id, keyring, passphrase });

            try {
                setRecoveryPhrase(seedToRecoveryPhrase(keys.seed));
            } finally {
                await wipeAccountKeys(keys);
            }
        });

    const submitNewPassphrase = (passphrase: string) =>
        run(async () => {
            await changePassphrase(passphrase);
            setNotice("Passphrase changed. Use the new one next time you unlock.");
            setAction("idle");
        });

    return (
        <div className="space-y-4">
            <section className="border border-border bg-card">
                <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
                    <div>
                        <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
                            <KeyRound className="size-4" />
                            End-to-end encryption
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Secrets are encrypted and decrypted only in your browser and CLI.
                        </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={lock}>
                        <Lock />
                        Lock now
                    </Button>
                </div>
                <div className="space-y-4 px-4 py-4">
                    <div>
                        <p className="text-xs tracking-wide text-muted-foreground uppercase">
                            Your key fingerprint
                        </p>
                        <p className="mt-1 font-mono text-sm text-foreground">{fingerprint ?? "…"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Teammates see this next to your name. Compare it with them before sharing production
                            secrets.
                        </p>
                    </div>

                    {notice ? <p className="text-sm text-foreground">{notice}</p> : null}
                    {error ? <p className="text-sm text-destructive">{error}</p> : null}

                    {action === "change-passphrase" ? (
                        <div className="space-y-3">
                            <PassphraseForm
                                submitLabel="Change passphrase"
                                isPending={isPending}
                                requireConfirmation
                                autoFocus
                                onSubmit={(passphrase) => void submitNewPassphrase(passphrase)}
                            />
                            <Button type="button" variant="ghost" size="sm" onClick={close}>
                                Cancel
                            </Button>
                        </div>
                    ) : action === "show-phrase" ? (
                        <div className="space-y-3">
                            {recoveryPhrase ? (
                                <RecoveryPhraseGrid phrase={recoveryPhrase} />
                            ) : (
                                <PassphraseForm
                                    submitLabel="Show recovery phrase"
                                    isPending={isPending}
                                    autoFocus
                                    onSubmit={(passphrase) => void revealPhrase(passphrase)}
                                />
                            )}
                            <Button type="button" variant="ghost" size="sm" onClick={close}>
                                {recoveryPhrase ? "Hide" : "Cancel"}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setAction("change-passphrase")}>
                                Change passphrase
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setAction("show-phrase")}>
                                Show recovery phrase
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            <section className="border border-destructive/40 bg-card">
                <div className="border-b border-destructive/40 px-4 py-3">
                    <h2 className="text-lg font-semibold text-foreground">Reset keys</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Only if you lost your recovery phrase or think it leaked.
                    </p>
                </div>
                <div className="px-4 py-4">
                    {action === "reset" ? (
                        <VaultSetup
                            mode="reset"
                            onCancel={close}
                            onComplete={() => {
                                close();
                                setNotice("New keys created. Ask teammates to share environments with you again.");
                            }}
                        />
                    ) : (
                        <Button type="button" variant="destructive" size="sm" onClick={() => setAction("reset")}>
                            Reset my keys
                        </Button>
                    )}
                </div>
            </section>
        </div>
    );
}
