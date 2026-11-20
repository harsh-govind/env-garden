import { authorizeServiceAccountRequest, serviceAccountJson } from "@/lib/service-accounts";
import { revokeServiceAccountToken } from "@/prisma/services/service-account";
import type { ServiceAccountTokenRouteContext } from "@/types/service-account";

export async function DELETE(request: Request, context: ServiceAccountTokenRouteContext) {
    try {
        const auth = await authorizeServiceAccountRequest(request);

        if ("response" in auth) {
            return auth.response;
        }

        const { workspaceId, serviceAccountId, tokenId } = await context.params;
        const result = await revokeServiceAccountToken({
            workspaceId,
            actorUserId: auth.userId,
            serviceAccountId,
            tokenId,
        });

        switch (result.status) {
            case "OK":
                return serviceAccountJson({ success: true });
            case "FORBIDDEN":
                return serviceAccountJson({ error: "Only workspace owners and admins can manage service accounts." }, 403);
            case "NOT_FOUND":
                return serviceAccountJson({ error: "Token not found." }, 404);
        }
    } catch (error) {
        console.error("Failed to revoke service account token:", error);
        return serviceAccountJson({ error: "Internal server error." }, 500);
    }
}
