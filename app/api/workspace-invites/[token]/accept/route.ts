import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acceptWorkspaceInvite } from "@/prisma/services/workspace-member";
import type { WorkspaceInviteAcceptRouteContext } from "@/types/workspace";

export async function POST(
    _: Request,
    context: WorkspaceInviteAcceptRouteContext
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { token } = await context.params;

        if (!token) {
            return NextResponse.json(
                { error: "Invite token is required." },
                { status: 400 }
            );
        }

        const result = await acceptWorkspaceInvite({
            token,
            userId: session.user.id,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Invite not found." },
                { status: 404 }
            );
        }

        if (result.status === "EXPIRED") {
            return NextResponse.json(
                { error: "Invite has expired." },
                { status: 410 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "This invite is for a different account." },
                { status: 403 }
            );
        }

        if (result.status === "ALREADY_MEMBER") {
            return NextResponse.json(
                { error: "You are already a member of this workspace." },
                { status: 409 }
            );
        }

        return NextResponse.json({ member: result.member });
    } catch (error) {
        console.error("Failed to accept workspace invite:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
