import {
    VAULT_IDLE_TIMEOUT_MS,
    VAULT_SESSION_DATABASE,
    VAULT_SESSION_KEY_ID,
    VAULT_SESSION_STORAGE_KEY,
    VAULT_SESSION_STORE,
} from "@/constants/vault";
import type { StoredVaultSession } from "@/types/vault";

function toBase64(bytes: Uint8Array) {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}

function fromBase64(value: string) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function isBrowserStorageAvailable() {
    return typeof window !== "undefined" && "indexedDB" in window && Boolean(window.crypto?.subtle);
}

function openDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(VAULT_SESSION_DATABASE, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(VAULT_SESSION_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function runStore<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>
) {
    const database = await openDatabase();

    try {
        return await new Promise<T>((resolve, reject) => {
            const transaction = database.transaction(VAULT_SESSION_STORE, mode);
            const request = action(transaction.objectStore(VAULT_SESSION_STORE));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    } finally {
        database.close();
    }
}

async function getWrappingKey(create: boolean) {
    const existing = await runStore<CryptoKey | undefined>("readonly", (store) =>
        store.get(VAULT_SESSION_KEY_ID)
    );

    if (existing || !create) {
        return existing ?? null;
    }

    const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
    await runStore("readwrite", (store) => store.put(key, VAULT_SESSION_KEY_ID));
    return key;
}

function readStoredSession(): StoredVaultSession | null {
    try {
        const raw = sessionStorage.getItem(VAULT_SESSION_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as StoredVaultSession) : null;
    } catch {
        return null;
    }
}

function writeStoredSession(session: StoredVaultSession) {
    try {
        sessionStorage.setItem(VAULT_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
        return;
    }
}

function encodeAdditionalData(userId: string) {
    return new TextEncoder().encode(`env-garden/vault-session/v1/${userId}`);
}

export async function saveVaultSession(userId: string, seed: Uint8Array) {
    if (!isBrowserStorageAvailable()) {
        return;
    }

    try {
        const key = await getWrappingKey(true);

        if (!key) {
            return;
        }

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const data = new Uint8Array(
            await crypto.subtle.encrypt(
                { name: "AES-GCM", iv, additionalData: encodeAdditionalData(userId) },
                key,
                Uint8Array.from(seed)
            )
        );

        writeStoredSession({
            userId,
            iv: toBase64(iv),
            data: toBase64(data),
            expiresAt: Date.now() + VAULT_IDLE_TIMEOUT_MS,
        });
    } catch {
        return;
    }
}

export async function loadVaultSession(userId: string) {
    if (!isBrowserStorageAvailable()) {
        return null;
    }

    const session = readStoredSession();

    if (!session || session.userId !== userId || session.expiresAt <= Date.now()) {
        if (session) {
            await clearVaultSession();
        }

        return null;
    }

    try {
        const key = await getWrappingKey(false);

        if (!key) {
            return null;
        }

        return new Uint8Array(
            await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: fromBase64(session.iv),
                    additionalData: encodeAdditionalData(userId),
                },
                key,
                fromBase64(session.data)
            )
        );
    } catch {
        await clearVaultSession();
        return null;
    }
}

export function extendVaultSession() {
    const session = readStoredSession();

    if (session) {
        writeStoredSession({ ...session, expiresAt: Date.now() + VAULT_IDLE_TIMEOUT_MS });
    }
}

export async function clearVaultSession() {
    if (typeof window === "undefined") {
        return;
    }

    try {
        sessionStorage.removeItem(VAULT_SESSION_STORAGE_KEY);
    } catch {
        return;
    }

    if (!isBrowserStorageAvailable()) {
        return;
    }

    try {
        await runStore("readwrite", (store) => store.delete(VAULT_SESSION_KEY_ID));
    } catch {
        return;
    }
}
