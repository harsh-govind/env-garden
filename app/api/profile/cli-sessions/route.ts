import { NextResponse } from "next/server";
import { cliNoStoreHeaders } from "@/constants/cli";
import { auth } from "@/lib/auth";
import {
    listActiveCliTokensForUser,
    revokeAllCliTokensForUser,
} from "@/prisma/services/cli";
import type { CliSessionsResponse } from "@/types/cli";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tokens = await listActiveCliTokensForUser(session.user.id);
        const response: CliSessionsResponse = {
            sessions: tokens.map((token) => ({
                id: token.id,
                name: token.name,
                tokenPrefix: token.tokenPrefix,
                createdAt: token.createdAt.toISOString(),
                lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
                expiresAt: token.expiresAt?.toISOString() ?? null,
            })),
        };

        return NextResponse.json(response, { headers: cliNoStoreHeaders });
    } catch (error) {
        console.error("Failed to list CLI sessions:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const revokedCount = await revokeAllCliTokensForUser(session.user.id);

        return NextResponse.json({ revokedCount }, { headers: cliNoStoreHeaders });
    } catch (error) {
        console.error("Failed to revoke CLI sessions:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
