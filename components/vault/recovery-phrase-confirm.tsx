"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { RECOVERY_PHRASE_CONFIRM_WORD_COUNT } from "@/constants/vault";
import type { RecoveryPhraseConfirmProps } from "@/types/vault";

function pickPositions(wordCount: number) {
    const positions = new Set<number>();
    const random = new Uint32Array(1);

    while (positions.size < RECOVERY_PHRASE_CONFIRM_WORD_COUNT) {
        crypto.getRandomValues(random);
        positions.add(random[0] % wordCount);
    }

    return [...positions].sort((left, right) => left - right);
}

export default function RecoveryPhraseConfirm({
    phrase,
    onConfirmed,
    onBack,
}: RecoveryPhraseConfirmProps) {
    const words = useMemo(() => phrase.split(" "), [phrase]);
    const [positions] = useState(() => pickPositions(words.length));
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [error, setError] = useState<string | null>(null);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const isCorrect = positions.every(
            (position) => (answers[position] ?? "").trim().toLowerCase() === words[position]
        );

        if (!isCorrect) {
            setError("Those words don't match. Check your saved copy.");
            return;
        }

        onConfirmed();
    };

    return (
        <form className="space-y-4" onSubmit={submit}>
            <p className="text-sm text-muted-foreground">
                Enter these words from your recovery phrase to confirm you saved it.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
                {positions.map((position) => (
                    <label
                        key={position}
                        className="block text-xs tracking-wide text-muted-foreground uppercase"
                    >
                        Word #{position + 1}
                        <input
                            value={answers[position] ?? ""}
                            onChange={(event) => {
                                setAnswers((current) => ({ ...current, [position]: event.target.value }));
                                setError(null);
                            }}
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            required
                            className="mt-1 block h-9 w-full border border-input bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                        />
                    </label>
                ))}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="lg" onClick={onBack}>
                    Back
                </Button>
                <Button type="submit" size="lg">
                    Confirm
                </Button>
            </div>
        </form>
    );
}
