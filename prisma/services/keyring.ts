import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import type { EncryptedKeyringPayload } from "@/types/crypto";
import type { KeyringRecord, SaveKeyringResult } from "@/types/keyring";

const keyringSelect = {
    signPublicKey: true,
    boxPublicKey: true,
    encryptedSeed: true,
    kdfSalt: true,
    kdfAlgorithm: true,
    kdfOpsLimit: true,
    kdfMemLimitBytes: true,
    createdAt: true,
    updatedAt: true,
} as const;

type KeyringRow = Prisma.UserKeyringGetPayload<{ select: typeof keyringSelect }>;

function mapKeyringRow(row: KeyringRow): KeyringRecord {
    return {
        signPublicKey: row.signPublicKey,
        boxPublicKey: row.boxPublicKey,
        encryptedSeed: row.encryptedSeed,
        kdfSalt: row.kdfSalt,
        kdfParams: {
            algorithm: "argon2id13",
            opsLimit: row.kdfOpsLimit,
            memLimitBytes: row.kdfMemLimitBytes,
        },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function toKeyringData(payload: EncryptedKeyringPayload) {
    return {
        signPublicKey: payload.signPublicKey,
        boxPublicKey: payload.boxPublicKey,
        encryptedSeed: payload.encryptedSeed,
        kdfSalt: payload.kdfSalt,
        kdfAlgorithm: payload.kdfParams.algorithm,
        kdfOpsLimit: payload.kdfParams.opsLimit,
        kdfMemLimitBytes: payload.kdfParams.memLimitBytes,
    };
}

function isUniqueConstraintError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === "P2002"
    );
}

export async function getKeyringForUser(userId: string) {
    const row = await prisma.userKeyring.findUnique({
        where: { userId },
        select: keyringSelect,
    });

    return row ? mapKeyringRow(row) : null;
}

export async function createKeyringForUser(
    userId: string,
    payload: EncryptedKeyringPayload
): Promise<SaveKeyringResult> {
    try {
        const row = await prisma.userKeyring.create({
            data: {
                userId,
                ...toKeyringData(payload),
            },
            select: keyringSelect,
        });

        return { status: "OK", keyring: mapKeyringRow(row) };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { status: "CONFLICT" };
        }

        throw error;
    }
}

export async function rewrapKeyringForUser(
    userId: string,
    payload: EncryptedKeyringPayload
): Promise<SaveKeyringResult> {
    return prisma.$transaction(async (tx) => {
        const current = await tx.userKeyring.findUnique({
            where: { userId },
            select: { signPublicKey: true, boxPublicKey: true },
        });

        if (!current) {
            return { status: "NOT_FOUND" as const };
        }

        if (
            current.signPublicKey !== payload.signPublicKey
            || current.boxPublicKey !== payload.boxPublicKey
        ) {
            return { status: "KEY_MISMATCH" as const };
        }

        const row = await tx.userKeyring.update({
            where: { userId },
            data: {
                encryptedSeed: payload.encryptedSeed,
                kdfSalt: payload.kdfSalt,
                kdfAlgorithm: payload.kdfParams.algorithm,
                kdfOpsLimit: payload.kdfParams.opsLimit,
                kdfMemLimitBytes: payload.kdfParams.memLimitBytes,
            },
            select: keyringSelect,
        });

        return { status: "OK" as const, keyring: mapKeyringRow(row) };
    });
}

export async function replaceKeyringForUser(
    userId: string,
    payload: EncryptedKeyringPayload
): Promise<SaveKeyringResult> {
    try {
        const row = await prisma.userKeyring.upsert({
            where: { userId },
            create: {
                userId,
                ...toKeyringData(payload),
            },
            update: toKeyringData(payload),
            select: keyringSelect,
        });

        return { status: "OK", keyring: mapKeyringRow(row) };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { status: "CONFLICT" };
        }

        throw error;
    }
}
