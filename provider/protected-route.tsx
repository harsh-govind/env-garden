"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { publicRoutePathPrefixes, publicRoutePaths } from "@/constants/routes";
import type { ProtectedRouteProviderProps } from "@/types/auth";

function isPublicRoute(pathname: string) {
    return (
        publicRoutePaths.includes(pathname as typeof publicRoutePaths[number])
        || publicRoutePathPrefixes.some((routePrefix) => pathname.startsWith(routePrefix))
    );
}

export default function ProtectedRouteProvider({
    isAuthenticated,
    children,
}: ProtectedRouteProviderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const isProtectedRoute = !isPublicRoute(pathname);

    useEffect(() => {
        if (!isAuthenticated && isProtectedRoute) {
            router.replace("/");
        }
    }, [isAuthenticated, isProtectedRoute, router]);

    if (!isAuthenticated && isProtectedRoute) {
        return null;
    }

    return <>{children}</>;
}
