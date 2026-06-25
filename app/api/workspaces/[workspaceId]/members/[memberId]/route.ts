import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseMemberAccessBody } from "@/lib/member-access";
import { serializeWorkspaceMember } from "@/lib/member-serializers";
import {
    removeWorkspaceMember,
    updateWorkspaceMember,
} from "@/prisma/services/member";
import type {
    UpdateWorkspaceMemberBody,
    UpdateWorkspaceMemberResponse,
    WorkspaceMemberRouteContext,
} from "@/types/member";

export async function PATCH(request: Request, context: WorkspaceMemberRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, memberId } = await context.params;

        if (!workspaceId || !memberId) {
            return NextResponse.json(
                { error: "Workspace id and member id are required." },
                { status: 400 }
            );
        }

        const body = (await request
            .json()
            .catch(() => null)) as UpdateWorkspaceMemberBody | null;

        if (!body) {
            return NextResponse.json(
                { error: "Invalid JSON payload." },
                { status: 400 }
            );
        }

        const access = parseMemberAccessBody(body);

        if ("error" in access) {
            return NextResponse.json({ error: access.error }, { status: 400 });
        }

        const result = await updateWorkspaceMember({
            workspaceId,
            memberId,
            actorUserId: session.user.id,
            access: access.value,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Workspace member not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "You cannot update that member." },
                { status: 403 }
            );
        }

        if (result.status === "INVALID_ACCESS") {
            return NextResponse.json(
                { error: "Member project access is invalid." },
                { status: 400 }
            );
        }

        const payload: UpdateWorkspaceMemberResponse = {
            member: serializeWorkspaceMember(result.member),
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to update workspace member:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function DELETE(_: Request, context: WorkspaceMemberRouteContext) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, memberId } = await context.params;

        if (!workspaceId || !memberId) {
            return NextResponse.json(
                { error: "Workspace id and member id are required." },
                { status: 400 }
            );
        }

        const result = await removeWorkspaceMember({
            workspaceId,
            memberId,
            actorUserId: session.user.id,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Workspace member not found or access denied." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "You cannot remove that member." },
                { status: 403 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Failed to remove workspace member:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
