import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendWorkspaceInviteEmail } from "@/lib/email";
import {
    parseInviteEmail,
    parseMemberAccessBody,
} from "@/lib/member-access";
import {
    serializeWorkspaceInvite,
    serializeWorkspaceMembers,
} from "@/lib/member-serializers";
import {
    inviteWorkspaceMember,
    listWorkspaceMembersForUser,
    markWorkspaceInviteEmailSent,
} from "@/prisma/services/member";
import type {
    InviteWorkspaceMemberBody,
    InviteWorkspaceMemberResponse,
} from "@/types/member";
import type { WorkspaceRouteContext } from "@/types/workspace";

function buildInviteUrl(request: Request, token: string) {
    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        new URL(request.url).origin;

    return new URL(`/invites/${token}`, appUrl).toString();
}

export async function GET(_: Request, context: WorkspaceRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId } = await context.params;

        if (!workspaceId) {
            return NextResponse.json(
                { error: "Workspace id is required." },
                { status: 400 }
            );
        }

        const result = await listWorkspaceMembersForUser({
            workspaceId,
            userId: session.user.id,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Workspace not found or access denied." },
                { status: 404 }
            );
        }

        return NextResponse.json(serializeWorkspaceMembers(result.record));
    } catch (error) {
        console.error("Failed to list workspace members:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request, context: WorkspaceRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId } = await context.params;

        if (!workspaceId) {
            return NextResponse.json(
                { error: "Workspace id is required." },
                { status: 400 }
            );
        }

        const body = (await request
            .json()
            .catch(() => null)) as InviteWorkspaceMemberBody | null;

        if (!body) {
            return NextResponse.json(
                { error: "Invalid JSON payload." },
                { status: 400 }
            );
        }

        const email = parseInviteEmail(body.email);

        if ("error" in email) {
            return NextResponse.json({ error: email.error }, { status: 400 });
        }

        const access = parseMemberAccessBody(body);

        if ("error" in access) {
            return NextResponse.json({ error: access.error }, { status: 400 });
        }

        const result = await inviteWorkspaceMember({
            workspaceId,
            actorUserId: session.user.id,
            email: email.value,
            access: access.value,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Workspace not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "Only owners and admins can invite members." },
                { status: 403 }
            );
        }

        if (result.status === "INVALID_ACCESS") {
            return NextResponse.json(
                { error: "Member project access is invalid." },
                { status: 400 }
            );
        }

        if (result.status === "MEMBER_EXISTS") {
            return NextResponse.json(
                { error: "That user is already a workspace member." },
                { status: 409 }
            );
        }

        if (result.status === "INVITE_EXISTS") {
            return NextResponse.json(
                { error: "A pending invite already exists for that email." },
                { status: 409 }
            );
        }

        const emailResult = await sendWorkspaceInviteEmail({
            to: result.invite.email,
            workspaceName: result.workspaceName,
            invitedByEmail: result.actorEmail,
            inviteUrl: buildInviteUrl(request, result.token),
        });

        if (emailResult.status === "SENT") {
            await markWorkspaceInviteEmailSent(result.invite.id);
            result.invite.emailSentAt = new Date();
        } else if (emailResult.status === "FAILED") {
            console.error("Failed to send workspace invite email:", emailResult.error);
        }

        const payload: InviteWorkspaceMemberResponse = {
            invite: serializeWorkspaceInvite(result.invite),
            emailStatus: emailResult.status,
        };

        return NextResponse.json(payload, { status: 201 });
    } catch (error) {
        console.error("Failed to invite workspace member:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
