import {
    authorizeServiceAccountRequest,
    parseCreateServiceAccountBody,
    serviceAccountJson,
} from "@/lib/service-accounts";
import {
    createServiceAccount,
    listServiceAccounts,
} from "@/prisma/services/service-account";
import type { CreateServiceAccountBody } from "@/types/service-account";
import type { WorkspaceRouteContext } from "@/types/workspace";

export async function GET(request: Request, context: WorkspaceRouteContext) {
    try {
        const auth = await authorizeServiceAccountRequest(request);

        if ("response" in auth) {
            return auth.response;
        }

        const { workspaceId } = await context.params;
        const serviceAccounts = await listServiceAccounts({ workspaceId, userId: auth.userId });

        if (!serviceAccounts) {
            return serviceAccountJson({ error: "Only workspace owners and admins can manage service accounts." }, 403);
        }

        return serviceAccountJson({ serviceAccounts });
    } catch (error) {
        console.error("Failed to list service accounts:", error);
        return serviceAccountJson({ error: "Internal server error." }, 500);
    }
}

export async function POST(request: Request, context: WorkspaceRouteContext) {
    try {
        const auth = await authorizeServiceAccountRequest(request);

        if ("response" in auth) {
            return auth.response;
        }

        const { workspaceId } = await context.params;
        const body = (await request.json().catch(() => null)) as CreateServiceAccountBody | null;
        const parsed = parseCreateServiceAccountBody(body);

        if ("error" in parsed) {
            return serviceAccountJson({ error: parsed.error }, 400);
        }

        const result = await createServiceAccount({
            workspaceId,
            actorUserId: auth.userId,
            ...parsed.value,
        });

        switch (result.status) {
            case "OK":
                return serviceAccountJson({ serviceAccountId: result.serviceAccountId }, 201);
            case "FORBIDDEN":
                return serviceAccountJson({ error: "Only workspace owners and admins can manage service accounts." }, 403);
            case "KEYRING_REQUIRED":
                return serviceAccountJson({ error: "Set up your encryption keys first." }, 409);
            case "INVALID_ACCESS":
                return serviceAccountJson({ error: "Select projects and environments in this workspace." }, 400);
            case "CONFLICT":
                return serviceAccountJson({ error: "Those keys are already in use. Try again." }, 409);
        }
    } catch (error) {
        console.error("Failed to create service account:", error);
        return serviceAccountJson({ error: "Internal server error." }, 500);
    }
}
