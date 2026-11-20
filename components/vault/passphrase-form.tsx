"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { validateVaultPassphrase } from "@/lib/crypto/keyring";
import type { PassphraseFormProps } from "@/types/vault";

const inputClassName =
    "mt-1 block h-9 w-full border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50";

export default function PassphraseForm({
    submitLabel,
    isPending,
    requireConfirmation = false,
    autoFocus = false,
    onSubmit,
}: PassphraseFormProps) {
    const [passphrase, setPassphrase] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [isVisible, setIsVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (requireConfirmation) {
            const validationError = validateVaultPassphrase(passphrase);

            if (validationError) {
                setError(validationError);
                return;
            }

            if (passphrase !== confirmation) {
                setError("The passphrases do not match.");
                return;
            }
        }

        setError(null);
        onSubmit(passphrase);
    };

    return (
        <form className="space-y-3" onSubmit={submit}>
            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                {requireConfirmation ? "New vault passphrase" : "Vault passphrase"}
                <span className="relative block">
                    <input
                        type={isVisible ? "text" : "password"}
                        value={passphrase}
                        onChange={(event) => {
                            setPassphrase(event.target.value);
                            setError(null);
                        }}
                        autoComplete={requireConfirmation ? "new-password" : "current-password"}
                        autoFocus={autoFocus}
                        required
                        className={`${inputClassName} pr-10`}
                    />
                    <button
                        type="button"
                        onClick={() => setIsVisible((current) => !current)}
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={isVisible ? "Hide passphrase" : "Show passphrase"}
                    >
                        {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                </span>
            </label>
            {requireConfirmation ? (
                <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                    Confirm passphrase
                    <input
                        type={isVisible ? "text" : "password"}
                        value={confirmation}
                        onChange={(event) => {
                            setConfirmation(event.target.value);
                            setError(null);
                        }}
                        autoComplete="new-password"
                        required
                        className={inputClassName}
                    />
                </label>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" size="lg" disabled={isPending || passphrase.length === 0}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {submitLabel}
            </Button>
        </form>
    );
}
