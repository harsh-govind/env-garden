import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeWorkspaceSummary } from "@/lib/workspace-serializers";
import {
    createWorkspaceForUser,
    listWorkspacesForUser,
} from "@/prisma/services/workspace";
import type { CreateWorkspaceBody } from "@/types/workspace";

function parseCreateWorkspaceBody(body: CreateWorkspaceBody) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
        typeof body.description === "string" ? body.description.trim() : "";

    if (name.length < 2 || name.length > 80) {
        return {
            error:
                "Workspace name must be between 2 and 80 characters.",
        };
    }

    if (description.length > 280) {
        return {
            error: "Workspace description must be 280 characters or less.",
        };
    }

    return {
        value: {
            name,
            description: description || null,
        },
    };
}

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await listWorkspacesForUser(session.user.id);

    return NextResponse.json({
        workspaces: workspaces.map(serializeWorkspaceSummary),
    });
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as CreateWorkspaceBody | null;

    if (!body) {
        return NextResponse.json(
            { error: "Invalid JSON payload." },
            { status: 400 }
        );
    }

    const parsed = parseCreateWorkspaceBody(body);

    if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const workspace = await createWorkspaceForUser({
        userId: session.user.id,
        name: parsed.value.name,
        description: parsed.value.description,
    });

    return NextResponse.json(
        {
            workspaceId: workspace.id,
        },
        { status: 201 }
    );
}
