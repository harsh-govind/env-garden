import {
    authorizeServiceAccountRequest,
    parseCreateServiceAccountTokenBody,
    serviceAccountJson,
} from "@/lib/service-accounts";
import { createServiceAccountToken } from "@/prisma/services/service-account";
import type {
    CreateServiceAccountTokenBody,
    ServiceAccountRouteContext,
} from "@/types/service-account";

export async function POST(request: Request, context: ServiceAccountRouteContext) {
    try {
        const auth = await authorizeServiceAccountRequest(request);

        if ("response" in auth) {
            return auth.response;
        }

        const { workspaceId, serviceAccountId } = await context.params;
        const body = (await request.json().catch(() => null)) as CreateServiceAccountTokenBody | null;
        const parsed = parseCreateServiceAccountTokenBody(body);

        if ("error" in parsed) {
            return serviceAccountJson({ error: parsed.error }, 400);
        }

        const result = await createServiceAccountToken({
            workspaceId,
            actorUserId: auth.userId,
            serviceAccountId,
            ...parsed.value,
        });

        switch (result.status) {
            case "OK":
                return serviceAccountJson({ tokenId: result.tokenId }, 201);
            case "FORBIDDEN":
                return serviceAccountJson({ error: "Only workspace owners and admins can manage service accounts." }, 403);
            case "NOT_FOUND":
                return serviceAccountJson({ error: "Service account not found." }, 404);
            case "NOT_HOLDER":
                return serviceAccountJson({ error: "Only the person who created this service account can issue its tokens." }, 403);
            case "CONFLICT":
                return serviceAccountJson({ error: "Token collision. Try again." }, 409);
        }
    } catch (error) {
        console.error("Failed to create service account token:", error);
        return serviceAccountJson({ error: "Internal server error." }, 500);
    }
}
