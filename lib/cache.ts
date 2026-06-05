import type { CacheEntry, InMemoryCache } from "@/types/cache";

function isExpired(expiresAt: number | null) {
    return expiresAt !== null && Date.now() > expiresAt;
}

export function createInMemoryCache<T>(defaultTtlMs?: number): InMemoryCache<T> {
    const store = new Map<string, CacheEntry<T>>();

    return {
        get(key) {
            const entry = store.get(key);

            if (!entry) {
                return undefined;
            }

            if (isExpired(entry.expiresAt)) {
                store.delete(key);
                return undefined;
            }

            return entry.value;
        },
        set(key, value, ttlMs) {
            const ttl = ttlMs ?? defaultTtlMs;
            const expiresAt = typeof ttl === "number" ? Date.now() + ttl : null;
            store.set(key, {
                value,
                expiresAt,
            });
        },
        has(key) {
            const entry = store.get(key);

            if (!entry) {
                return false;
            }

            if (isExpired(entry.expiresAt)) {
                store.delete(key);
                return false;
            }

            return true;
        },
        delete(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
    };
}
