import { NextResponse } from "next/server";
import { API_RATE_LIMIT } from "@/constants/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getRequestSession } from "@/lib/request-auth";
import { listEnvironmentKeyAccess } from "@/prisma/services/environment-key";
import type { WorkspaceRouteContext } from "@/types/workspace";

export async function GET(request: Request, context: WorkspaceRouteContext) {
    try {
        const session = await getRequestSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

        if (limited) {
            return limited;
        }

        const { workspaceId } = await context.params;
        const projectId = new URL(request.url).searchParams.get("projectId")?.trim() || null;
        const keys = await listEnvironmentKeyAccess({
            workspaceId,
            userId: session.user.id,
            projectId,
        });

        if (!keys) {
            return NextResponse.json({ error: "Workspace not found or access denied." }, { status: 404 });
        }

        return NextResponse.json({ keys }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Failed to list environment key access:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
