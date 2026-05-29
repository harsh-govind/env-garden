export type ProtectedRoute = {
    path: string;
    redirectTo: string;
};

export const protectedRoutes: ProtectedRoute[] = [
    {
        path: "/",
        redirectTo: "/api/auth/signin",
    },
];