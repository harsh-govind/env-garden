import { NextResponse } from "next/server";
import { cliNoStoreHeaders } from "@/constants/cli";
import { authenticateCliRequest } from "@/lib/cli/auth";
import { revokeCliTokenRecord } from "@/prisma/services/cli";

export async function DELETE(request: Request) {
    try {
        const authentication = await authenticateCliRequest(request);

        if (authentication.status === "UNAUTHORIZED") {
            return NextResponse.json(
                { error: "Invalid or expired CLI token." },
                { status: 401, headers: cliNoStoreHeaders }
            );
        }

        await revokeCliTokenRecord({
            tokenId: authentication.tokenId,
            revokedAt: new Date(),
        });

        return NextResponse.json(
            { success: true },
            { headers: cliNoStoreHeaders }
        );
    } catch (error) {
        console.error("Failed to revoke CLI token:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500, headers: cliNoStoreHeaders }
        );
    }
}
