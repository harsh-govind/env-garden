"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TWO_FACTOR_CODE_LENGTH } from "@/constants/auth";
import type { CodeFormProps } from "@/types/settings";

/** A 6-digit authenticator code input with a submit button. */
export default function CodeForm({ label, submitLabel, isPending, onSubmit }: CodeFormProps) {
    const [code, setCode] = useState("");

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit(code.replace(/\s/g, ""));
    };

    return (
        <form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
            <label className="block text-xs tracking-wide text-muted-foreground uppercase">
                {label}
                <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={TWO_FACTOR_CODE_LENGTH + 1}
                    placeholder="123456"
                    required
                    className="mt-1 block h-9 w-36 border border-input bg-background px-3 font-mono text-sm tracking-widest text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                />
            </label>
            <Button type="submit" size="lg" disabled={isPending || code.trim().length < TWO_FACTOR_CODE_LENGTH}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {submitLabel}
            </Button>
        </form>
    );
}
