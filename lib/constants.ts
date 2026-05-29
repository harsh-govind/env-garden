import type { ProtectedRoute } from "@/types/auth";

export const protectedRoutes: ProtectedRoute[] = [
    {
        path: "/",
        redirectTo: "/api/auth/signin",
    },
];