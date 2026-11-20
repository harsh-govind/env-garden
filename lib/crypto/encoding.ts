import { base64Pattern } from "@/constants/crypto";
import type { Sodium } from "@/lib/crypto/sodium";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export function utf8Encode(value: string) {
    return textEncoder.encode(value);
}

export function utf8Decode(bytes: Uint8Array) {
    return textDecoder.decode(bytes);
}

export function toBase64(sodium: Sodium, bytes: Uint8Array) {
    return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

export function fromBase64(sodium: Sodium, value: string, expectedLength?: number) {
    if (typeof value !== "string" || !base64Pattern.test(value)) {
        throw new Error("Invalid base64 value.");
    }

    const bytes = sodium.from_base64(value, sodium.base64_variants.ORIGINAL);

    if (expectedLength !== undefined && bytes.length !== expectedLength) {
        throw new Error("Decoded value has an unexpected length.");
    }

    return bytes;
}

export function toBase64Url(sodium: Sodium, bytes: Uint8Array) {
    return sodium.to_base64(bytes, sodium.base64_variants.URLSAFE_NO_PADDING);
}

export function concatBytes(...parts: Uint8Array[]) {
    const length = parts.reduce((total, part) => total + part.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;

    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }

    return result;
}

export function xorBytes(left: Uint8Array, right: Uint8Array) {
    if (left.length !== right.length) {
        throw new Error("Cannot combine values of different lengths.");
    }

    const result = new Uint8Array(left.length);

    for (let index = 0; index < left.length; index += 1) {
        result[index] = left[index] ^ right[index];
    }

    return result;
}

export function encodeFields(domain: string, fields: (string | number | boolean | Uint8Array)[]) {
    const parts: Uint8Array[] = [];

    for (const field of [domain, ...fields]) {
        const bytes = field instanceof Uint8Array
            ? field
            : utf8Encode(typeof field === "string" ? field : String(field));
        const length = new Uint8Array(4);
        new DataView(length.buffer).setUint32(0, bytes.length, false);
        parts.push(length, bytes);
    }

    return concatBytes(...parts);
}

export function wipe(sodium: Sodium, ...buffers: (Uint8Array | null | undefined)[]) {
    for (const buffer of buffers) {
        if (buffer) {
            sodium.memzero(buffer);
        }
    }
}
