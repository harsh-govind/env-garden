import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RateLimitResult, RateLimitRule } from "@/types/rate-limit";

export function getClientIp(request: Request) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const last = forwardedFor?.split(",").map((part) => part.trim()).filter(Boolean).at(-1);

    return last || request.headers.get("x-real-ip") || "unknown";
}

export async function consumeRateLimit(rule: RateLimitRule, subject: string): Promise<RateLimitResult> {
    const key = `${rule.bucket}:${subject}`;
    const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
        INSERT INTO "ApiRateLimit" ("key", "count", "windowStart")
        VALUES (${key}, 1, now())
        ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE
                WHEN "ApiRateLimit"."windowStart" < now() - make_interval(secs => ${rule.windowSeconds})
                THEN 1 ELSE "ApiRateLimit"."count" + 1 END,
            "windowStart" = CASE
                WHEN "ApiRateLimit"."windowStart" < now() - make_interval(secs => ${rule.windowSeconds})
                THEN now() ELSE "ApiRateLimit"."windowStart" END
        RETURNING "count", "windowStart"
    `;
    const row = rows[0];

    if (!row) {
        return { allowed: true, retryAfterSeconds: 0 };
    }

    const resetsAt = row.windowStart.getTime() + rule.windowSeconds * 1000;

    return {
        allowed: row.count <= rule.limit,
        retryAfterSeconds: Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000)),
    };
}

export async function rateLimitResponse(rule: RateLimitRule, subject: string) {
    const result = await consumeRateLimit(rule, subject);

    if (result.allowed) {
        return null;
    }

    return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
    );
}
