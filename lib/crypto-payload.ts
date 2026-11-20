import "server-only";
import { base64Pattern } from "@/constants/crypto";

export function decodeBase64Field(value: unknown, expectedByteLength?: number) {
    if (typeof value !== "string" || value.length === 0 || !base64Pattern.test(value)) {
        return null;
    }

    const bytes = Buffer.from(value, "base64");

    if (bytes.toString("base64") !== value) {
        return null;
    }

    if (expectedByteLength !== undefined && bytes.length !== expectedByteLength) {
        return null;
    }

    return value;
}

export function decodeBase64FieldWithin(value: unknown, minBytes: number, maxBytes: number) {
    const decoded = decodeBase64Field(value);

    if (!decoded) {
        return null;
    }

    const length = Buffer.from(decoded, "base64").length;

    return length >= minBytes && length <= maxBytes ? decoded : null;
}
