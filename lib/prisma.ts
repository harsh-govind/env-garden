import "server-only";
import "@/lib/encryption";
import { PrismaPg } from "@prisma/adapter-pg";
import {
    DATABASE_POOL_MAX,
    TRANSACTION_MAX_WAIT_MS,
    TRANSACTION_TIMEOUT_MS,
} from "@/constants/database";
import { PrismaClient } from "@/prisma/generated/client";

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL is required to initialize Prisma.");
    }

    const adapter = new PrismaPg({ connectionString, max: DATABASE_POOL_MAX });

    return new PrismaClient({
        adapter,
        transactionOptions: {
            maxWait: TRANSACTION_MAX_WAIT_MS,
            timeout: TRANSACTION_TIMEOUT_MS,
        },
    });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
