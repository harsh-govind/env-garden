import { NextResponse } from "next/server";
import { cliNoStoreHeaders } from "@/constants/cli";
import { auth } from "@/lib/auth";
import { revokeCliTokenForUser } from "@/prisma/services/cli";
import type { CliTokenRouteContext } from "@/types/cli";

export async function DELETE(_request: Request, context: CliTokenRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { tokenId } = await context.params;
        const isRevoked = await revokeCliTokenForUser({
            userId: session.user.id,
            tokenId,
        });

        if (!isRevoked) {
            return NextResponse.json(
                { error: "CLI session not found." },
                { status: 404, headers: cliNoStoreHeaders }
            );
        }

        return NextResponse.json({ success: true }, { headers: cliNoStoreHeaders });
    } catch (error) {
        console.error("Failed to revoke CLI session:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
