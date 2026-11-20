import { NextResponse } from "next/server";
import { API_RATE_LIMIT } from "@/constants/rate-limit";
import { parseSealedShare } from "@/lib/environment-keys";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getRequestSession } from "@/lib/request-auth";
import { grantEnvironmentKey } from "@/prisma/services/environment-key";
import type {
    EnvironmentKeyRouteContext,
    GrantEnvironmentKeyBody,
} from "@/types/environment-key";

export async function POST(request: Request, context: EnvironmentKeyRouteContext) {
    try {
        const session = await getRequestSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

        if (limited) {
            return limited;
        }

        const { workspaceId, keyId } = await context.params;
        const body = (await request.json().catch(() => null)) as GrantEnvironmentKeyBody | null;
        const share = parseSealedShare(body);

        if (
            !body
            || !share
            || typeof body.recipientUserId !== "string"
            || !Number.isInteger(body.version)
        ) {
            return NextResponse.json({ error: "Invalid key share." }, { status: 400 });
        }

        const result = await grantEnvironmentKey({
            workspaceId,
            environmentKeyId: keyId,
            granterUserId: session.user.id,
            recipientUserId: body.recipientUserId,
            version: body.version as number,
            ...share,
        });

        switch (result.status) {
            case "OK":
                return NextResponse.json({ success: true }, { status: 201 });
            case "NOT_FOUND":
                return NextResponse.json({ error: "Environment key not found or access denied." }, { status: 404 });
            case "NO_KEY":
                return NextResponse.json({ error: "You don't hold this environment's key." }, { status: 403 });
            case "STALE_KEY":
                return NextResponse.json({ error: "This key was rotated. Reload and try again." }, { status: 409 });
            case "RECIPIENT_FORBIDDEN":
                return NextResponse.json({ error: "That member doesn't have permission for this environment." }, { status: 403 });
            case "RECIPIENT_NO_KEYRING":
                return NextResponse.json({ error: "That member hasn't set up encryption keys yet." }, { status: 409 });
            case "INVALID_SHARE":
                return NextResponse.json({ error: "The key share signature is invalid." }, { status: 400 });
        }
    } catch (error) {
        console.error("Failed to share environment key:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
