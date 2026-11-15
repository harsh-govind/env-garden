"use client";

import { useEffect, useState } from "react";
import type { GitHubStarsResponse } from "@/types/landing";

/** Live star count from /api/github/stars; renders nothing until loaded. */
export function GitHubStars() {
    const [stars, setStars] = useState<number | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        fetch("/api/github/stars", { signal: controller.signal })
            .then((response) => (response.ok ? response.json() : null))
            .then((data: GitHubStarsResponse | null) => {
                if (typeof data?.stars === "number") {
                    setStars(data.stars);
                }
            })
            .catch(() => undefined);

        return () => controller.abort();
    }, []);

    if (stars === null) {
        return null;
    }

    return (
        <span className="tabular-nums">
            {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}
        </span>
    );
}
