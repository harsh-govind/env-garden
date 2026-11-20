"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PassphraseForm from "@/components/vault/passphrase-form";
import RecoveryPhraseConfirm from "@/components/vault/recovery-phrase-confirm";
import RecoveryPhraseGrid from "@/components/vault/recovery-phrase-grid";
import { Button } from "@/components/ui/button";
import { useVault } from "@/contexts/vault";
import {
    generateAccountKeys,
    seedToRecoveryPhrase,
    wipeAccountKeys,
} from "@/lib/crypto/keyring";
import type { AccountKeys } from "@/types/crypto";
import type { VaultSetupProps, VaultSetupStep } from "@/types/vault";

export default function VaultSetup({ mode, onCancel, onComplete }: VaultSetupProps) {
    const { createKeyring, resetKeys } = useVault();
    const [step, setStep] = useState<VaultSetupStep>("intro");
    const [phrase, setPhrase] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const keysRef = useRef<AccountKeys | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            void wipeAccountKeys(keysRef.current);
            keysRef.current = null;
        };
    }, []);

    const start = async () => {
        setIsPending(true);
        setError(null);

        try {
            await wipeAccountKeys(keysRef.current);
            const keys = await generateAccountKeys();
            keysRef.current = keys;
            setPhrase(seedToRecoveryPhrase(keys.seed));
            setStep("phrase");
        } catch (startError) {
            setError(startError instanceof Error ? startError.message : "Could not create keys.");
        } finally {
            setIsPending(false);
        }
    };

    const finish = async (passphrase: string) => {
        const keys = keysRef.current;

        if (!keys) {
            setStep("intro");
            return;
        }

        setIsPending(true);
        setError(null);
        keysRef.current = null;

        try {
            if (mode === "reset") {
                await resetKeys(keys, passphrase);
            } else {
                await createKeyring(keys, passphrase);
            }

            onComplete?.();
        } catch (finishError) {
            if (isMountedRef.current) {
                keysRef.current = keys;
                setError(finishError instanceof Error ? finishError.message : "Could not save your keys.");
            } else {
                await wipeAccountKeys(keys);
            }
        } finally {
            if (isMountedRef.current) {
                setIsPending(false);
            }
        }
    };

    if (step === "phrase" && phrase) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Write these 24 words down and keep them somewhere safe and offline. They are the only
                    way back in if you forget your passphrase. Nobody, including env.garden, can recover
                    them for you.
                </p>
                <RecoveryPhraseGrid phrase={phrase} />
                <div className="flex flex-wrap gap-2">
                    {onCancel ? (
                        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
                            Cancel
                        </Button>
                    ) : null}
                    <Button type="button" size="lg" onClick={() => setStep("confirm")}>
                        I&apos;ve saved my recovery phrase
                    </Button>
                </div>
            </div>
        );
    }

    if (step === "confirm" && phrase) {
        return (
            <RecoveryPhraseConfirm
                phrase={phrase}
                onBack={() => setStep("phrase")}
                onConfirmed={() => setStep("passphrase")}
            />
        );
    }

    if (step === "passphrase") {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Choose a vault passphrase. You&apos;ll enter it to unlock your secrets on each device. It
                    never leaves your browser.
                </p>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <PassphraseForm
                    submitLabel={mode === "reset" ? "Replace my keys" : "Finish setup"}
                    isPending={isPending}
                    requireConfirmation
                    autoFocus
                    onSubmit={(passphrase) => void finish(passphrase)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {mode === "reset" ? (
                <div className="flex gap-3 border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <p>
                        New keys can&apos;t open anything shared with your old keys. You&apos;ll lose access to
                        every environment until someone who still has access shares it with you again.
                        Environments only you could open are lost for good.
                    </p>
                </div>
            ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Your secrets are encrypted in your browser before they reach the server.</li>
                    <li>You get a 24-word recovery phrase and choose a vault passphrase.</li>
                    <li>Only people you share an environment with can read it, not even env.garden.</li>
                </ul>
            )}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
                {onCancel ? (
                    <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
                        Cancel
                    </Button>
                ) : null}
                <Button
                    type="button"
                    size="lg"
                    variant={mode === "reset" ? "destructive" : "default"}
                    disabled={isPending}
                    onClick={() => void start()}
                >
                    {isPending ? <Loader2 className="animate-spin" /> : null}
                    {mode === "reset" ? "Create new keys" : "Create my keys"}
                </Button>
            </div>
        </div>
    );
}
