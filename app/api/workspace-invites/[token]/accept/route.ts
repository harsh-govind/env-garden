import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acceptWorkspaceInvite } from "@/prisma/services/member";
import type {
    AcceptWorkspaceInviteResponse,
    WorkspaceInviteAcceptRouteContext,
} from "@/types/member";

export async function POST(_: Request, context: WorkspaceInviteAcceptRouteContext) {
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

        if (result.status === "UNAVAILABLE") {
            return NextResponse.json(
                { error: "This invite is no longer available." },
                { status: 409 }
            );
        }

        if (result.status === "EXPIRED") {
            return NextResponse.json(
                { error: "This invite has expired." },
                { status: 410 }
            );
        }

        if (result.status === "EMAIL_MISMATCH") {
            return NextResponse.json(
                { error: "Sign in with the email address this invite was sent to." },
                { status: 403 }
            );
        }

        if (result.status === "MEMBER_EXISTS") {
            return NextResponse.json(
                { error: "You are already a member of this workspace." },
                { status: 409 }
            );
        }

        const payload: AcceptWorkspaceInviteResponse = {
            workspaceId: result.workspaceId,
            workspaceName: result.workspaceName,
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to accept workspace invite:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
