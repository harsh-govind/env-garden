import { APP_SESSION_MAX_AGE_SECONDS } from "@/constants/auth";
import { prisma } from "@/lib/prisma";
import type {
    CreateAppSessionInput,
    RevokeAppSessionInput,
    RevokeOtherAppSessionsInput,
    UpsertLegacyAppSessionInput,
} from "@/types/settings";

function activeSince() {
    return new Date(Date.now() - APP_SESSION_MAX_AGE_SECONDS * 1000);
}

export function createAppSession(input: CreateAppSessionInput) {
    return prisma.appSession.create({
        data: {
            userId: input.userId,
            userAgent: input.userAgent?.slice(0, 512) ?? null,
            ipAddress: input.ipAddress?.slice(0, 64) ?? null,
        },
        select: { id: true },
    });
}

/** One shared record per user for sign-ins made before sessions were tracked. */
export function upsertLegacyAppSession(input: UpsertLegacyAppSessionInput) {
    return prisma.appSession.upsert({
        where: { id: input.sessionId },
        create: {
            id: input.sessionId,
            userId: input.userId,
            userAgent: input.userAgent?.slice(0, 512) ?? null,
            ipAddress: input.ipAddress?.slice(0, 64) ?? null,
        },
        update: {},
        select: { id: true, userId: true, lastSeenAt: true, revokedAt: true },
    });
}

export function findAppSession(sessionId: string) {
    return prisma.appSession.findUnique({
        where: { id: sessionId },
        select: {
            id: true,
            userId: true,
            lastSeenAt: true,
            revokedAt: true,
        },
    });
}

export function touchAppSession(sessionId: string) {
    return prisma.appSession.update({
        where: { id: sessionId },
        data: { lastSeenAt: new Date() },
        select: { id: true },
    });
}

export function listActiveAppSessionsForUser(userId: string) {
    return prisma.appSession.findMany({
        where: {
            userId,
            revokedAt: null,
            lastSeenAt: { gt: activeSince() },
        },
        orderBy: { lastSeenAt: "desc" },
        select: {
            id: true,
            userAgent: true,
            ipAddress: true,
            createdAt: true,
            lastSeenAt: true,
        },
    });
}

export async function revokeAppSession(sessionId: string) {
    await prisma.appSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}

export async function revokeAppSessionForUser(input: RevokeAppSessionInput) {
    const result = await prisma.appSession.updateMany({
        where: { id: input.sessionId, userId: input.userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    return result.count > 0;
}

export async function revokeOtherAppSessionsForUser(input: RevokeOtherAppSessionsInput) {
    const result = await prisma.appSession.updateMany({
        where: {
            userId: input.userId,
            revokedAt: null,
            ...(input.currentSessionId ? { id: { not: input.currentSessionId } } : {}),
        },
        data: { revokedAt: new Date() },
    });

    return result.count;
}
