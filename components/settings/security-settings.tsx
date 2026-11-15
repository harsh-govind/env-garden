"use client";

import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useState } from "react";
import BackupCodesList from "@/components/settings/backup-codes-list";
import CodeForm from "@/components/settings/code-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthenticated } from "@/contexts/authenticated";
import { authClient } from "@/lib/auth-client";
import type { SecurityAction, TwoFactorSetup } from "@/types/settings";

export default function SecuritySettings() {
    const router = useRouter();
    const { user } = useAuthenticated();
    const [isEnabled, setIsEnabled] = useState(Boolean(user?.twoFactorEnabled));
    const [action, setAction] = useState<SecurityAction>("idle");
    const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = async (task: () => Promise<void>) => {
        setIsPending(true);
        setError(null);

        try {
            await task();
        } catch (taskError) {
            setError(taskError instanceof Error ? taskError.message : "Something went wrong. Try again.");
        } finally {
            setIsPending(false);
        }
    };

    /** Confirms the user still holds the authenticator before a sensitive change. */
    const requireValidCode = async (code: string) => {
        const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code });

        if (verifyError) {
            throw new Error(verifyError.message ?? "That code didn't work. Try again.");
        }
    };

    const startSetup = () =>
        run(async () => {
            const { data, error: enableError } = await authClient.twoFactor.enable({});

            if (enableError || !data || !("totpURI" in data)) {
                throw new Error(enableError?.message ?? "Could not start setup.");
            }

            setSetup({
                totpURI: data.totpURI,
                secret: new URL(data.totpURI).searchParams.get("secret") ?? "",
                qrCodeDataUrl: await QRCode.toDataURL(data.totpURI, { margin: 1, width: 192 }),
                backupCodes: data.backupCodes,
            });
            setAction("setup");
        });

    const confirmSetup = (code: string) =>
        run(async () => {
            await requireValidCode(code);
            setBackupCodes(setup?.backupCodes ?? []);
            setSetup(null);
            setIsEnabled(true);
            setAction("backup-codes");
            router.refresh();
        });

    const disable = (code: string) =>
        run(async () => {
            await requireValidCode(code);
            const { error: disableError } = await authClient.twoFactor.disable({});

            if (disableError) {
                throw new Error(disableError.message ?? "Could not turn off two-factor authentication.");
            }

            setIsEnabled(false);
            setAction("idle");
            router.refresh();
        });

    const regenerate = (code: string) =>
        run(async () => {
            await requireValidCode(code);
            const { data, error: generateError } = await authClient.twoFactor.generateBackupCodes({});

            if (generateError || !data) {
                throw new Error(generateError?.message ?? "Could not generate new backup codes.");
            }

            setBackupCodes(data.backupCodes);
            setAction("backup-codes");
        });

    return (
        <section className="border border-border bg-card">
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
                <div>
                    <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
                        <ShieldCheck className="size-4" />
                        Two-factor authentication
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Require a code from an authenticator app every time you sign in.
                    </p>
                </div>
                <Badge variant={isEnabled ? "default" : "outline"}>{isEnabled ? "On" : "Off"}</Badge>
            </div>

            <div className="space-y-4 px-4 py-4">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                {action === "setup" && setup ? (
                    <div className="space-y-4">
                        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                            <li>Scan the QR code with an authenticator app (1Password, Google Authenticator, Authy…).</li>
                            <li>Enter the 6-digit code it shows to finish.</li>
                        </ol>
                        <div className="flex flex-wrap items-start gap-4">
                            {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
                            <img
                                src={setup.qrCodeDataUrl}
                                alt="QR code for your authenticator app"
                                width={192}
                                height={192}
                                className="border border-border bg-white p-1"
                            />
                            <div className="min-w-0 space-y-1">
                                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                                    Can&apos;t scan? Enter this key
                                </p>
                                <code className="block break-all border border-border bg-muted px-2 py-1 font-mono text-sm">
                                    {setup.secret}
                                </code>
                            </div>
                        </div>
                        <CodeForm label="Code from your app" submitLabel="Turn on" isPending={isPending} onSubmit={confirmSetup} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAction("idle")}>
                            Cancel
                        </Button>
                    </div>
                ) : action === "backup-codes" ? (
                    <div className="space-y-3">
                        <BackupCodesList codes={backupCodes} />
                        <Button type="button" size="sm" onClick={() => setAction("idle")}>
                            I&apos;ve saved these codes
                        </Button>
                    </div>
                ) : action === "disable" || action === "regenerate" ? (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            {action === "disable"
                                ? "Enter a code from your authenticator app to turn off two-factor authentication."
                                : "Enter a code from your authenticator app. Your old backup codes will stop working."}
                        </p>
                        <CodeForm
                            label="Code from your app"
                            submitLabel={action === "disable" ? "Turn off" : "Generate new codes"}
                            isPending={isPending}
                            onSubmit={action === "disable" ? disable : regenerate}
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAction("idle")}>
                            Cancel
                        </Button>
                    </div>
                ) : isEnabled ? (
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setAction("regenerate")}>
                            Regenerate backup codes
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setAction("disable")}>
                            <ShieldOff />
                            Turn off
                        </Button>
                    </div>
                ) : (
                    <Button
                        type="button"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                            void startSetup();
                        }}
                    >
                        {isPending ? <Loader2 className="animate-spin" /> : null}
                        Set up authenticator app
                    </Button>
                )}
            </div>
        </section>
    );
}
