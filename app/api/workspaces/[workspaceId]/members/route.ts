import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inviteWorkspaceMember, listWorkspaceMembersForUser } from "@/prisma/services/workspace-member";
import { isEnvironmentTypeValue } from "@/lib/constants";
import type {
    AddWorkspaceMemberBody,
    InviteEnvironmentScopeValue,
    WorkspaceInviteProjectAccessInput,
    WorkspaceRouteContext,
} from "@/types/workspace";
import { ASSIGNABLE_WORKSPACE_ROLES } from "@/lib/constants";
import type { WorkspaceRoleValue } from "@/types/workspace";

const VALID_ENVIRONMENT_SCOPES: InviteEnvironmentScopeValue[] = [
    "ALL_ENVIRONMENTS",
    "SELECTED_ENVIRONMENTS",
];

function parseProjectAccesses(
    value: unknown
): { value: WorkspaceInviteProjectAccessInput[] } | { error: string } {
    if (value === undefined) {
        return { value: [] };
    }

    if (!Array.isArray(value)) {
        return { error: "Project access selections must be an array." };
    }

    const projectAccesses: WorkspaceInviteProjectAccessInput[] = [];

    for (const item of value) {
        if (!item || typeof item !== "object") {
            return { error: "Invalid project access selection." };
        }

        const record = item as Record<string, unknown>;
        const projectId =
            typeof record.projectId === "string" ? record.projectId.trim() : "";
        const environmentScope =
            typeof record.environmentScope === "string" &&
                VALID_ENVIRONMENT_SCOPES.includes(
                    record.environmentScope as InviteEnvironmentScopeValue
                )
                ? (record.environmentScope as InviteEnvironmentScopeValue)
                : null;

        if (!projectId || !environmentScope) {
            return { error: "Project and environment scope are required." };
        }

        if (
            record.environments !== undefined &&
            !Array.isArray(record.environments)
        ) {
            return { error: "Environment selections must be an array." };
        }

        const environmentValues = Array.isArray(record.environments)
            ? record.environments
            : [];
        const environments = Array.from(
            new Set(environmentValues.filter(isEnvironmentTypeValue))
        );

        if (
            Array.isArray(record.environments) &&
            environments.length !== record.environments.length
        ) {
            return { error: "Invalid environment selection." };
        }

        projectAccesses.push({
            projectId,
            environmentScope,
            environments,
        });
    }

    return { value: projectAccesses };
}

function parseAddMemberBody(body: AddWorkspaceMemberBody) {
    const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role =
        typeof body.role === "string" &&
            ASSIGNABLE_WORKSPACE_ROLES.includes(body.role as WorkspaceRoleValue)
            ? (body.role as WorkspaceRoleValue)
            : "MEMBER";

    if (!email || !email.includes("@") || email.length > 320) {
        return { error: "A valid email address is required." };
    }

    const parsedProjectAccesses = parseProjectAccesses(body.projectAccesses);

    if ("error" in parsedProjectAccesses) {
        return parsedProjectAccesses;
    }

    return {
        value: {
            email,
            role,
            projectAccesses: parsedProjectAccesses.value,
        },
    };
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

        const result = await listWorkspaceMembersForUser(
            workspaceId,
            session.user.id
        );

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Workspace not found or access denied." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            members: result.members,
            invites: result.invites,
            projects: result.projects,
        });
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

        const body = (await request.json().catch(() => null)) as
            | AddWorkspaceMemberBody
            | null;

        if (!body) {
            return NextResponse.json(
                { error: "Invalid request body." },
                { status: 400 }
            );
        }

        const parsed = parseAddMemberBody(body);

        if ("error" in parsed) {
            return NextResponse.json(
                { error: parsed.error },
                { status: 400 }
            );
        }

        const result = await inviteWorkspaceMember({
            workspaceId,
            email: parsed.value.email,
            role: parsed.value.role,
            projectAccesses: parsed.value.projectAccesses,
            invitedById: session.user.id,
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
                { error: result.message },
                { status: 400 }
            );
        }

        if (result.status === "ALREADY_MEMBER") {
            return NextResponse.json(
                { error: "This user is already a member of the workspace." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { invite: result.invite },
            { status: 201 }
        );
    } catch (error) {
        console.error("Failed to invite workspace member:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
