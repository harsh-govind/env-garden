import { Skeleton } from "@/components/ui/skeleton";
import type { SettingsListSkeletonProps } from "@/types/settings";

export default function SettingsListSkeleton({ rows = 2 }: SettingsListSkeletonProps) {
    return (
        <ul aria-busy="true" aria-label="Loading" className="divide-y divide-border border border-border">
            {Array.from({ length: rows }).map((_, index) => (
                <li key={index} className="flex items-center justify-between gap-4 px-3 py-3">
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-64 max-w-full" />
                    </div>
                    <Skeleton className="h-7 w-20" />
                </li>
            ))}
        </ul>
    );
}
