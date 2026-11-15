import { NextResponse } from "next/server";
import { cliNoStoreHeaders } from "@/constants/cli";
import { getSession } from "@/lib/auth";
import { approveCliLoginRequest } from "@/lib/cli/login";
import type { CliLoginRequestRouteContext } from "@/types/cli";

export async function POST(
    _: Request,
    context: CliLoginRequestRouteContext
) {
    try {
        const session = await getSession();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401, headers: cliNoStoreHeaders }
            );
        }

        const { requestId } = await context.params;
        const result = await approveCliLoginRequest({
            requestId,
            userId: session.user.id,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "CLI login request not found." },
                { status: 404, headers: cliNoStoreHeaders }
            );
        }

        if (result.status === "EXPIRED") {
            return NextResponse.json(
                { error: "CLI login request has expired." },
                { status: 410, headers: cliNoStoreHeaders }
            );
        }

        return NextResponse.json(
            { success: true },
            { headers: cliNoStoreHeaders }
        );
    } catch (error) {
        console.error("Failed to approve CLI login request:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500, headers: cliNoStoreHeaders }
        );
    }
}
