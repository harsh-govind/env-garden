import type { UpdatedAtSource, UpdatedAtValue } from "@/types/updated-at";

function toTimestamp(value: Exclude<UpdatedAtValue, null | undefined>) {
    const date = value instanceof Date ? value : new Date(value);
    const timestamp = date.getTime();

    return Number.isNaN(timestamp) ? null : timestamp;
}

export function findMostRecentUpdatedAt(
    ...sources: UpdatedAtSource[]
): Date | null {
    let latestTimestamp: number | null = null;

    const visit = (source: UpdatedAtSource) => {
        if (source === null || source === undefined) {
            return;
        }

        if (Array.isArray(source)) {
            source.forEach(visit);
            return;
        }

        if (
            source instanceof Date ||
            typeof source === "string" ||
            typeof source === "number"
        ) {
            const timestamp = toTimestamp(source);

            if (
                timestamp !== null &&
                (latestTimestamp === null || timestamp > latestTimestamp)
            ) {
                latestTimestamp = timestamp;
            }

            return;
        }

        if (source.updatedAt !== null && source.updatedAt !== undefined) {
            const timestamp = toTimestamp(source.updatedAt);

            if (
                timestamp !== null &&
                (latestTimestamp === null || timestamp > latestTimestamp)
            ) {
                latestTimestamp = timestamp;
            }
        }
    };

    sources.forEach(visit);

    return latestTimestamp === null ? null : new Date(latestTimestamp);
}
