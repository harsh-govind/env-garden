import type { ProtectedRoute } from "@/types/auth";

export const SIGN_IN_PATH = "/signin";
export const TWO_FACTOR_PATH = "/signin/two-factor";
export const SETTINGS_PATH = "/settings";
export const SETTINGS_PROFILE_PATH = "/settings/profile";
export const SETTINGS_ACCOUNT_PATH = "/settings/account";
export const SETTINGS_SESSIONS_PATH = "/settings/sessions";
export const SETTINGS_SECURITY_PATH = "/settings/security";

export const publicRoutePaths = ["/", SIGN_IN_PATH, TWO_FACTOR_PATH] as const;

export const DOCS_PATH = "/docs";
export const CLI_DOCS_PATH = "/docs/cli";
export const CLI_AUTHORIZE_PATH = "/cli/authorize";

export const publicRoutePathPrefixes = ["/invites/", `${CLI_AUTHORIZE_PATH}/`, DOCS_PATH] as const;

/** Routes that render their own full-page layout for every visitor. */
export const standaloneRoutePathPrefixes = [DOCS_PATH, CLI_AUTHORIZE_PATH] as const;

export const protectedRoutes: ProtectedRoute[] = [
    {
        path: "/",
        redirectTo: "/",
    },
    {
        path: "/:workspaceId/history",
        redirectTo: "/",
    },
    {
        path: "/:workspaceId/projects/:projectId",
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

export function isStandaloneRoute(pathname: string) {
    return standaloneRoutePathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function getMatchingProtectedRoute(pathname: string) {
    return protectedRoutes.find((route) => matchesRoutePath(pathname, route.path));
}
