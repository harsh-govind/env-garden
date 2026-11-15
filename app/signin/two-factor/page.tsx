"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { TWO_FACTOR_CODE_LENGTH } from "@/constants/auth";
import { SIGN_IN_PATH } from "@/constants/routes";
import { authClient } from "@/lib/auth-client";

export default function TwoFactorPage() {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const verify = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsVerifying(true);
        setError(null);

        const trimmedCode = code.trim();
        const { error: verifyError } = useBackupCode
            ? await authClient.twoFactor.verifyBackupCode({ code: trimmedCode })
            : await authClient.twoFactor.verifyTotp({ code: trimmedCode.replace(/\s/g, "") });

        if (verifyError) {
            setError(verifyError.message ?? "That code didn't work. Try again.");
            setIsVerifying(false);
            return;
        }

        router.replace("/");
        router.refresh();
    };

    return (
        <div className="space-y-8">
            <Link
                href={SIGN_IN_PATH}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
                <ArrowLeft className="size-3.5" />
                Start over
            </Link>

            <div className="space-y-4">
                <LogoMark className="size-10" />
                <div className="space-y-1.5">
                    <h1 className="text-2xl font-semibold tracking-tight">Two-factor authentication</h1>
                    <p className="text-sm text-muted-foreground">
                        {useBackupCode
                            ? "Enter one of your backup codes. Each code works once."
                            : "Enter the 6-digit code from your authenticator app."}
                    </p>
                </div>
            </div>

            <form className="w-full max-w-sm space-y-3" onSubmit={verify}>
                <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                    {useBackupCode ? "Backup code" : "Authentication code"}
                    <input
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        inputMode={useBackupCode ? "text" : "numeric"}
                        autoComplete="one-time-code"
                        autoFocus
                        required
                        placeholder={useBackupCode ? "xxxxx-xxxxx" : "123456"}
                        className="mt-1 h-9 w-full border border-input bg-background px-3 font-mono text-sm tracking-widest text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                    />
                </label>

                {error ? (
                    <p role="alert" className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                ) : null}

                <Button
                    className="w-full"
                    type="submit"
                    disabled={isVerifying || (!useBackupCode && code.trim().length < TWO_FACTOR_CODE_LENGTH)}
                >
                    {isVerifying ? <Loader2 className="animate-spin" /> : null}
                    Verify
                </Button>
            </form>

            <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => {
                    setUseBackupCode((current) => !current);
                    setCode("");
                    setError(null);
                }}
            >
                {useBackupCode ? "Use your authenticator app instead" : "Use a backup code instead"}
            </button>
        </div>
    );
}
