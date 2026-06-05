export type CacheEntry<T> = {
    value: T;
    expiresAt: number | null;
};

export type InMemoryCache<T> = {
    get: (key: string) => T | undefined;
    set: (key: string, value: T, ttlMs?: number) => void;
    has: (key: string) => boolean;
    delete: (key: string) => void;
    clear: () => void;
};
