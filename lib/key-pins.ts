import { KEY_PINS_STORAGE_PREFIX } from "@/constants/vault";
import type { KeyPin, KeyTrust } from "@/types/vault";

function storageKey(viewerUserId: string) {
    return `${KEY_PINS_STORAGE_PREFIX}${viewerUserId}`;
}

function readPins(viewerUserId: string): Record<string, KeyPin[]> {
    try {
        const raw = localStorage.getItem(storageKey(viewerUserId));
        const parsed = raw ? (JSON.parse(raw) as unknown) : null;
        return parsed && typeof parsed === "object" ? (parsed as Record<string, KeyPin[]>) : {};
    } catch {
        return {};
    }
}

function writePins(viewerUserId: string, pins: Record<string, KeyPin[]>) {
    try {
        localStorage.setItem(storageKey(viewerUserId), JSON.stringify(pins));
    } catch {
        return;
    }
}

export function getKeyTrust(
    viewerUserId: string,
    subjectUserId: string,
    keys: { signPublicKey: string; boxPublicKey?: string | null }
): KeyTrust {
    const pins = readPins(viewerUserId)[subjectUserId] ?? [];

    if (pins.length === 0) {
        return "new";
    }

    const matches = pins.some(
        (pin) =>
            pin.signPublicKey === keys.signPublicKey
            && (!keys.boxPublicKey || !pin.boxPublicKey || pin.boxPublicKey === keys.boxPublicKey)
    );

    return matches ? "pinned" : "changed";
}

export function pinKey(
    viewerUserId: string,
    subjectUserId: string,
    keys: { signPublicKey: string; boxPublicKey?: string | null }
) {
    const pins = readPins(viewerUserId);
    const existing = pins[subjectUserId] ?? [];
    const match = existing.find((pin) => pin.signPublicKey === keys.signPublicKey);

    if (match) {
        match.boxPublicKey ??= keys.boxPublicKey ?? null;
    } else {
        existing.push({
            signPublicKey: keys.signPublicKey,
            boxPublicKey: keys.boxPublicKey ?? null,
            pinnedAt: new Date().toISOString(),
        });
    }

    pins[subjectUserId] = existing;
    writePins(viewerUserId, pins);
}

export function trustOnFirstUse(
    viewerUserId: string,
    subjectUserId: string,
    keys: { signPublicKey: string; boxPublicKey?: string | null }
): KeyTrust {
    const trust = getKeyTrust(viewerUserId, subjectUserId, keys);

    if (trust === "new") {
        pinKey(viewerUserId, subjectUserId, keys);
        return "pinned";
    }

    if (trust === "pinned" && keys.boxPublicKey) {
        pinKey(viewerUserId, subjectUserId, keys);
    }

    return trust;
}
