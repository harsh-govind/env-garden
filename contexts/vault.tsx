"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    KEYRING_API_PATH,
    VAULT_ACTIVITY_THROTTLE_MS,
    VAULT_BROADCAST_CHANNEL,
    VAULT_IDLE_CHECK_INTERVAL_MS,
    VAULT_IDLE_TIMEOUT_MS,
} from "@/constants/vault";
import { useAuthenticated } from "@/contexts/authenticated";
import {
    computeFingerprint,
    decryptKeyring,
    deriveAccountKeys,
    encryptKeyring,
    getPublicAccountKeys,
    recoverAccountKeys,
    wipeAccountKeys,
} from "@/lib/crypto/keyring";
import {
    clearVaultSession,
    extendVaultSession,
    loadVaultSession,
    saveVaultSession,
} from "@/lib/vault-session";
import type { AccountKeys } from "@/types/crypto";
import type { KeyringResponse } from "@/types/keyring";
import type {
    VaultContextValue,
    VaultKeyring,
    VaultProviderProps,
    VaultStatus,
} from "@/types/vault";

const VaultContext = createContext<VaultContextValue | null>(null);

async function requestKeyring(method: "GET" | "POST" | "PATCH" | "PUT", body?: unknown) {
    const response = await fetch(KEYRING_API_PATH, {
        method,
        cache: "no-store",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => null)) as
        | (KeyringResponse & { error?: string })
        | null;

    if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "Could not reach the server.");
    }

    return payload.keyring;
}

export function VaultProvider({ children }: VaultProviderProps) {
    const { user } = useAuthenticated();
    const userId = user?.id ?? null;
    const [status, setStatus] = useState<VaultStatus>("loading");
    const [error, setError] = useState<string | null>(null);
    const [keyring, setKeyring] = useState<VaultKeyring | null>(null);
    const [keys, setKeys] = useState<AccountKeys | null>(null);
    const [fingerprint, setFingerprint] = useState<string | null>(null);
    const keysRef = useRef<AccountKeys | null>(null);
    const lastActivityRef = useRef(0);
    const channelRef = useRef<BroadcastChannel | null>(null);

    const replaceKeys = useCallback((nextKeys: AccountKeys | null) => {
        const previous = keysRef.current;
        keysRef.current = nextKeys;
        setKeys(nextKeys);

        if (previous && previous !== nextKeys) {
            void wipeAccountKeys(previous);
        }
    }, []);

    const applyKeyring = useCallback(async (nextKeyring: VaultKeyring | null) => {
        setKeyring(nextKeyring);
        setFingerprint(nextKeyring ? await computeFingerprint(nextKeyring) : null);
    }, []);

    const markUnlocked = useCallback(
        async (nextKeys: AccountKeys) => {
            if (!userId) {
                return;
            }

            replaceKeys(nextKeys);
            lastActivityRef.current = Date.now();
            setStatus("unlocked");
            setError(null);
            await saveVaultSession(userId, nextKeys.seed);
        },
        [replaceKeys, userId]
    );

    const lockLocally = useCallback(() => {
        replaceKeys(null);
        setStatus((current) => (current === "unlocked" ? "locked" : current));
    }, [replaceKeys]);

    const lock = useCallback(() => {
        lockLocally();
        void clearVaultSession();
        channelRef.current?.postMessage("lock");
    }, [lockLocally]);

    const reload = useCallback(async () => {
        if (!userId) {
            replaceKeys(null);
            setStatus("missing");
            return;
        }

        setStatus("loading");
        setError(null);

        try {
            const nextKeyring = await requestKeyring("GET");
            await applyKeyring(nextKeyring);

            if (!nextKeyring) {
                replaceKeys(null);
                setStatus("missing");
                return;
            }

            const storedSeed = await loadVaultSession(userId);

            if (storedSeed) {
                try {
                    const restored = await deriveAccountKeys(storedSeed);
                    const restoredPublicKeys = await getPublicAccountKeys(restored);

                    if (
                        restoredPublicKeys.signPublicKey === nextKeyring.signPublicKey
                        && restoredPublicKeys.boxPublicKey === nextKeyring.boxPublicKey
                    ) {
                        replaceKeys(restored);
                        lastActivityRef.current = Date.now();
                        setStatus("unlocked");
                        return;
                    }

                    await wipeAccountKeys(restored);
                    await clearVaultSession();
                } finally {
                    storedSeed.fill(0);
                }
            }

            replaceKeys(null);
            setStatus("locked");
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load your keys.");
            setStatus("error");
        }
    }, [applyKeyring, replaceKeys, userId]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            void reload();
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [reload]);

    useEffect(() => {
        if (typeof BroadcastChannel === "undefined") {
            return;
        }

        const channel = new BroadcastChannel(VAULT_BROADCAST_CHANNEL);
        channelRef.current = channel;
        channel.onmessage = (event) => {
            if (event.data === "lock") {
                lockLocally();
            }
        };

        return () => {
            channel.close();
            channelRef.current = null;
        };
    }, [lockLocally]);

    useEffect(() => {
        if (status !== "unlocked") {
            return;
        }

        const recordActivity = () => {
            const now = Date.now();

            if (now - lastActivityRef.current >= VAULT_ACTIVITY_THROTTLE_MS) {
                extendVaultSession();
            }

            lastActivityRef.current = now;
        };
        const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
        events.forEach((name) => window.addEventListener(name, recordActivity, { passive: true }));

        const interval = window.setInterval(() => {
            if (Date.now() - lastActivityRef.current >= VAULT_IDLE_TIMEOUT_MS) {
                lock();
            }
        }, VAULT_IDLE_CHECK_INTERVAL_MS);

        return () => {
            events.forEach((name) => window.removeEventListener(name, recordActivity));
            window.clearInterval(interval);
        };
    }, [lock, status]);

    useEffect(() => {
        return () => {
            void wipeAccountKeys(keysRef.current);
            keysRef.current = null;
        };
    }, []);

    const createKeyring = useCallback(
        async (nextKeys: AccountKeys, passphrase: string) => {
            if (!userId) {
                throw new Error("Sign in first.");
            }

            const payload = await encryptKeyring({ userId, keys: nextKeys, passphrase });
            const saved = await requestKeyring("POST", payload);
            await applyKeyring(saved);
            await markUnlocked(nextKeys);
        },
        [applyKeyring, markUnlocked, userId]
    );

    const unlock = useCallback(
        async (passphrase: string) => {
            if (!userId || !keyring) {
                throw new Error("Set up encryption first.");
            }

            const unlocked = await decryptKeyring({ userId, keyring, passphrase });
            await markUnlocked(unlocked);
        },
        [keyring, markUnlocked, userId]
    );

    const changePassphrase = useCallback(
        async (newPassphrase: string) => {
            const currentKeys = keysRef.current;

            if (!userId || !currentKeys) {
                throw new Error("Unlock first.");
            }

            const payload = await encryptKeyring({ userId, keys: currentKeys, passphrase: newPassphrase });
            const saved = await requestKeyring("PATCH", payload);
            await applyKeyring(saved);
        },
        [applyKeyring, userId]
    );

    const recover = useCallback(
        async (recoveryPhrase: string, newPassphrase: string) => {
            if (!userId || !keyring) {
                throw new Error("Set up encryption first.");
            }

            const recovered = await recoverAccountKeys({ recoveryPhrase, expected: keyring });

            try {
                const payload = await encryptKeyring({ userId, keys: recovered, passphrase: newPassphrase });
                const saved = await requestKeyring("PATCH", payload);
                await applyKeyring(saved);
            } catch (recoverError) {
                await wipeAccountKeys(recovered);
                throw recoverError;
            }

            await markUnlocked(recovered);
        },
        [applyKeyring, keyring, markUnlocked, userId]
    );

    const resetKeys = useCallback(
        async (nextKeys: AccountKeys, passphrase: string) => {
            if (!userId) {
                throw new Error("Sign in first.");
            }

            const payload = await encryptKeyring({ userId, keys: nextKeys, passphrase });
            const saved = await requestKeyring("PUT", payload);
            await applyKeyring(saved);
            await markUnlocked(nextKeys);
        },
        [applyKeyring, markUnlocked, userId]
    );

    const value = useMemo<VaultContextValue>(
        () => ({
            status,
            error,
            keyring,
            keys,
            fingerprint,
            reload,
            createKeyring,
            unlock,
            recover,
            changePassphrase,
            resetKeys,
            lock,
        }),
        [
            changePassphrase,
            createKeyring,
            error,
            fingerprint,
            keyring,
            keys,
            lock,
            recover,
            reload,
            resetKeys,
            status,
            unlock,
        ]
    );

    return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
    const context = useContext(VaultContext);

    if (!context) {
        throw new Error("useVault must be used within VaultProvider.");
    }

    return context;
}

export function useUnlockedKeys() {
    const { keys } = useVault();

    if (!keys) {
        throw new Error("Unlock your keys first.");
    }

    return keys;
}
