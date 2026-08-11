import { NextResponse } from "next/server";
import { cliNoStoreHeaders } from "@/constants/cli";
import { authenticateCliRequest } from "@/lib/cli/auth";

export async function GET(request: Request) {
    try {
        const authentication = await authenticateCliRequest(request);

        if (authentication.status === "UNAUTHORIZED") {
            return NextResponse.json(
                { error: "Invalid or expired CLI token." },
                { status: 401, headers: cliNoStoreHeaders }
            );
        }

        return NextResponse.json(
            {
                user: authentication.user,
            },
            { headers: cliNoStoreHeaders }
        );
    } catch (error) {
        console.error("Failed to verify CLI token:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500, headers: cliNoStoreHeaders }
        );
    }
}
