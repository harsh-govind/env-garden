"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMatchingProtectedRoute } from "@/lib/constants";
import type { ProtectedRouteProviderProps } from "@/types/auth";

export default function ProtectedRouteProvider({
    isAuthenticated,
    children,
}: ProtectedRouteProviderProps) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const matchedRoute = getMatchingProtectedRoute(pathname);

        if (matchedRoute && !isAuthenticated) {
            router.replace(matchedRoute.redirectTo);
        }
    }, [isAuthenticated, pathname, router]);

    return <>{children}</>;
}
