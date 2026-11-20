"use client";

import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import PassphraseForm from "@/components/vault/passphrase-form";
import VaultSetup from "@/components/vault/vault-setup";
import { Button } from "@/components/ui/button";
import { useVault } from "@/contexts/vault";
import { validateVaultPassphrase } from "@/lib/crypto/keyring";
import type { VaultUnlockMode } from "@/types/vault";

const inputClassName =
    "mt-1 block w-full border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50";

export default function VaultUnlock() {
    const { unlock, recover, fingerprint } = useVault();
    const [mode, setMode] = useState<VaultUnlockMode>("passphrase");
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recoveryPhrase, setRecoveryPhrase] = useState("");
    const [newPassphrase, setNewPassphrase] = useState("");
    const [newPassphraseConfirmation, setNewPassphraseConfirmation] = useState("");

    const run = async (task: () => Promise<void>) => {
        setIsPending(true);
        setError(null);

        try {
            await task();
        } catch (taskError) {
            setError(taskError instanceof Error ? taskError.message : "Something went wrong.");
        } finally {
            setIsPending(false);
        }
    };

    const submitRecovery = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validationError = validateVaultPassphrase(newPassphrase);

        if (validationError) {
            setError(validationError);
            return;
        }

        if (newPassphrase !== newPassphraseConfirmation) {
            setError("The passphrases do not match.");
            return;
        }

        void run(() => recover(recoveryPhrase, newPassphrase));
    };

    if (mode === "reset") {
        return <VaultSetup mode="reset" onCancel={() => setMode("passphrase")} />;
    }

    if (mode === "recover") {
        return (
            <form className="space-y-3" onSubmit={submitRecovery}>
                <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                    Recovery phrase
                    <textarea
                        value={recoveryPhrase}
                        onChange={(event) => {
                            setRecoveryPhrase(event.target.value);
                            setError(null);
                        }}
                        rows={4}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        className={`${inputClassName} font-mono`}
                    />
                </label>
                <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                    New vault passphrase
                    <input
                        type="password"
                        value={newPassphrase}
                        onChange={(event) => setNewPassphrase(event.target.value)}
                        autoComplete="new-password"
                        required
                        className={inputClassName}
                    />
                </label>
                <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                    Confirm passphrase
                    <input
                        type="password"
                        value={newPassphraseConfirmation}
                        onChange={(event) => setNewPassphraseConfirmation(event.target.value)}
                        autoComplete="new-password"
                        required
                        className={inputClassName}
                    />
                </label>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" size="lg" onClick={() => setMode("passphrase")}>
                        Back
                    </Button>
                    <Button type="submit" size="lg" disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : null}
                        Recover and unlock
                    </Button>
                </div>
            </form>
        );
    }

    return (
        <div className="space-y-4">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <PassphraseForm
                submitLabel="Unlock"
                isPending={isPending}
                autoFocus
                onSubmit={(passphrase) => void run(() => unlock(passphrase))}
            />
            {fingerprint ? (
                <p className="text-xs text-muted-foreground">
                    Key fingerprint <span className="font-mono">{fingerprint}</span>
                </p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
                <button
                    type="button"
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => {
                        setError(null);
                        setMode("recover");
                    }}
                >
                    Forgot passphrase? Use recovery phrase
                </button>
                <button
                    type="button"
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => {
                        setError(null);
                        setMode("reset");
                    }}
                >
                    Lost both? Reset keys
                </button>
            </div>
        </div>
    );
}
