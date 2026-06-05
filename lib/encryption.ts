import "server-only";
import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    timingSafeEqual,
} from "crypto";
import type {
    EncryptedProjectKeyPayload,
    EncryptedValuePayload,
} from "@/types/encryption";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTE_LENGTH = 32;
const IV_BYTE_LENGTH = 12;

function readMasterEncryptionKey() {
    const rawKey = process.env.MASTER_ENCRYPTION_KEY;

    if (!rawKey) {
        throw new Error("MASTER_ENCRYPTION_KEY is required.");
    }

    const key = /^[a-fA-F0-9]{64}$/.test(rawKey)
        ? Buffer.from(rawKey, "hex")
        : Buffer.from(rawKey, "utf8");

    if (key.length !== KEY_BYTE_LENGTH) {
        key.fill(0);
        throw new Error("MASTER_ENCRYPTION_KEY must be exactly 32 bytes.");
    }

    return key;
}

const masterEncryptionKey = readMasterEncryptionKey();

export function destroyBuffer(buffer: Buffer | null | undefined) {
    buffer?.fill(0);
}

export function generateProjectKey() {
    return randomBytes(KEY_BYTE_LENGTH);
}

function assertProjectKeyLength(key: Buffer) {
    if (key.length !== KEY_BYTE_LENGTH) {
        throw new Error("Project encryption key must be exactly 32 bytes.");
    }
}

function encryptBufferWithKey(
    plaintext: Buffer,
    key: Buffer
): EncryptedValuePayload {
    assertProjectKeyLength(key);

    const iv = randomBytes(IV_BYTE_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    try {
        return {
            encryptedValue: encrypted.toString("base64"),
            iv: iv.toString("base64"),
            authTag: authTag.toString("base64"),
        };
    } finally {
        encrypted.fill(0);
        authTag.fill(0);
        iv.fill(0);
    }
}

function decryptBufferWithKey(payload: EncryptedValuePayload, key: Buffer) {
    assertProjectKeyLength(key);

    const encrypted = Buffer.from(payload.encryptedValue, "base64");
    const iv = Buffer.from(payload.iv, "base64");
    const authTag = Buffer.from(payload.authTag, "base64");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    try {
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } finally {
        encrypted.fill(0);
        iv.fill(0);
        authTag.fill(0);
    }
}

export function encryptEnvValue(value: string, projectKey: Buffer) {
    const plaintext = Buffer.from(value, "utf8");

    try {
        return encryptBufferWithKey(plaintext, projectKey);
    } finally {
        plaintext.fill(0);
    }
}

export function encryptEnvValueBuffer(value: Buffer, projectKey: Buffer) {
    return encryptBufferWithKey(value, projectKey);
}

export function decryptEnvValue(payload: EncryptedValuePayload, projectKey: Buffer) {
    const plaintext = decryptBufferWithKey(payload, projectKey);

    try {
        return plaintext.toString("utf8");
    } finally {
        plaintext.fill(0);
    }
}

export function decryptEnvValueToBuffer(
    payload: EncryptedValuePayload,
    projectKey: Buffer
) {
    return decryptBufferWithKey(payload, projectKey);
}

export function encryptProjectKey(
    projectKey: Buffer
): EncryptedProjectKeyPayload {
    const payload = encryptBufferWithKey(projectKey, masterEncryptionKey);

    return {
        encryptedKey: payload.encryptedValue,
        iv: payload.iv,
        authTag: payload.authTag,
    };
}

export function decryptProjectKey(payload: EncryptedProjectKeyPayload) {
    const projectKey = decryptBufferWithKey(
        {
            encryptedValue: payload.encryptedKey,
            iv: payload.iv,
            authTag: payload.authTag,
        },
        masterEncryptionKey
    );

    try {
        if (projectKey.length !== KEY_BYTE_LENGTH) {
            throw new Error("Encrypted project key decrypted to an invalid length.");
        }

        const zeroBuffer = Buffer.alloc(KEY_BYTE_LENGTH);
        const isAllZero = timingSafeEqual(projectKey, zeroBuffer);
        zeroBuffer.fill(0);

        if (isAllZero) {
            throw new Error("Encrypted project key decrypted to an invalid value.");
        }

        return projectKey;
    } catch (error) {
        projectKey.fill(0);
        throw error;
    }
}
