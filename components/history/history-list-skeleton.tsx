"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryListSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
                <article
                    key={index}
                    className="border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                >
                    <Skeleton className="h-4 w-4/5" />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-3 w-36" />
                    </div>
                </article>
            ))}
        </div>
    );
}
