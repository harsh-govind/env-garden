import type { ProtectedRoute } from "@/types/auth";
import type { WorkspaceRoleValue } from "@/types/workspace";

export const protectedRoutes: ProtectedRoute[] = [
    {
        path: "/",
        redirectTo: "/",
    },
    {
        path: "/:workspaceId/history",
        redirectTo: "/",
    },
];

function normalizePath(path: string) {
    if (path.length > 1 && path.endsWith("/")) {
        return path.slice(0, -1);
    }

    return path;
}

export function matchesRoutePath(pathname: string, routePath: string) {
    const normalizedPathname = normalizePath(pathname);
    const normalizedRoutePath = normalizePath(routePath);

    const pathSegments = normalizedPathname.split("/").filter(Boolean);
    const routeSegments = normalizedRoutePath.split("/").filter(Boolean);

    if (pathSegments.length !== routeSegments.length) {
        return false;
    }

    return routeSegments.every((segment, index) => {
        if (segment.startsWith(":")) {
            return pathSegments[index]?.length > 0;
        }

        return segment === pathSegments[index];
    });
}

export function getMatchingProtectedRoute(pathname: string) {
    return protectedRoutes.find((route) => matchesRoutePath(pathname, route.path));
}

export function canViewHistory(role: WorkspaceRoleValue) {
    return role === "OWNER" || role === "ADMIN";
}
