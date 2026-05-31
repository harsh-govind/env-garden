"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ProtectedRouteProviderProps } from "@/types/auth";

export default function ProtectedRouteProvider({
    isAuthenticated,
    children,
}: ProtectedRouteProviderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const isProtectedRoute = pathname !== "/";

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
