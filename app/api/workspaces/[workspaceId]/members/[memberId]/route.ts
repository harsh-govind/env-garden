import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    removeWorkspaceMember,
    updateWorkspaceMember,
} from "@/prisma/services/workspace-member";
import type {
    UpdateWorkspaceMemberBody,
    WorkspaceMemberRouteContext,
} from "@/types/workspace";
import { ASSIGNABLE_WORKSPACE_ROLES } from "@/lib/constants";
import type {
    ProjectAccessScopeValue,
    WorkspaceRoleValue,
} from "@/types/workspace";
const VALID_SCOPES: ProjectAccessScopeValue[] = [
    "ALL_PROJECTS",
    "SELECTED_PROJECTS",
];

function parseUpdateMemberBody(body: UpdateWorkspaceMemberBody) {
    const updates: {
        role?: WorkspaceRoleValue;
        projectAccessScope?: ProjectAccessScopeValue;
    } = {};

    if (body.role !== undefined) {
        if (
            typeof body.role !== "string" ||
            !ASSIGNABLE_WORKSPACE_ROLES.includes(body.role as WorkspaceRoleValue)
        ) {
            return { error: "Invalid role. Must be ADMIN or MEMBER." };
        }
        updates.role = body.role as WorkspaceRoleValue;
    }

    if (body.projectAccessScope !== undefined) {
        if (
            typeof body.projectAccessScope !== "string" ||
            !VALID_SCOPES.includes(
                body.projectAccessScope as ProjectAccessScopeValue
            )
        ) {
            return {
                error: "Invalid project access scope. Must be ALL_PROJECTS or SELECTED_PROJECTS.",
            };
        }
        updates.projectAccessScope =
            body.projectAccessScope as ProjectAccessScopeValue;
    }

    if (!updates.role && !updates.projectAccessScope) {
        return { error: "No valid fields to update." };
    }

    return { value: updates };
}

export async function PATCH(
    request: Request,
    context: WorkspaceMemberRouteContext
) {
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

        const body = (await request.json().catch(() => null)) as
            | UpdateWorkspaceMemberBody
            | null;

        if (!body) {
            return NextResponse.json(
                { error: "Invalid request body." },
                { status: 400 }
            );
        }

        const parsed = parseUpdateMemberBody(body);

        if ("error" in parsed) {
            return NextResponse.json(
                { error: parsed.error },
                { status: 400 }
            );
        }

        const result = await updateWorkspaceMember({
            workspaceId,
            memberId,
            updaterUserId: session.user.id,
            role: parsed.value.role,
            projectAccessScope: parsed.value.projectAccessScope,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Workspace or member not found." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "You do not have permission to update this member." },
                { status: 403 }
            );
        }

        return NextResponse.json({ member: result.member });
    } catch (error) {
        console.error("Failed to update workspace member:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _: Request,
    context: WorkspaceMemberRouteContext
) {
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
            removerUserId: session.user.id,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Workspace or member not found." },
                { status: 404 }
            );
        }

        if (result.status === "FORBIDDEN") {
            return NextResponse.json(
                { error: "You do not have permission to remove this member." },
                { status: 403 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to remove workspace member:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
