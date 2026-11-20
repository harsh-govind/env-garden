import { authorizeServiceAccountRequest, serviceAccountJson } from "@/lib/service-accounts";
import { deleteServiceAccount } from "@/prisma/services/service-account";
import type { ServiceAccountRouteContext } from "@/types/service-account";

export async function DELETE(request: Request, context: ServiceAccountRouteContext) {
    try {
        const auth = await authorizeServiceAccountRequest(request);

        if ("response" in auth) {
            return auth.response;
        }

        const { workspaceId, serviceAccountId } = await context.params;
        const result = await deleteServiceAccount({
            workspaceId,
            actorUserId: auth.userId,
            serviceAccountId,
        });

        switch (result.status) {
            case "OK":
                return serviceAccountJson({ success: true });
            case "FORBIDDEN":
                return serviceAccountJson({ error: "Only workspace owners and admins can manage service accounts." }, 403);
            case "NOT_FOUND":
                return serviceAccountJson({ error: "Service account not found." }, 404);
        }
    } catch (error) {
        console.error("Failed to delete service account:", error);
        return serviceAccountJson({ error: "Internal server error." }, 500);
    }
}
