import sodium from "libsodium-wrappers-sumo";

export type Sodium = typeof sodium;

let sodiumReady: Promise<Sodium> | null = null;

export function loadSodium(): Promise<Sodium> {
    sodiumReady ??= sodium.ready.then(() => sodium);
    return sodiumReady;
}
