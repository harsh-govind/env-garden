import type { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export type AuthButtonsProps = {
    isAuthenticated: boolean;
    callbackUrl?: string;
};

export type ProtectedRoute = {
    path: string;
    redirectTo: string;
};

export type ProtectedRouteProviderProps = {
    isAuthenticated: boolean;
    children: ReactNode;
};

export type AuthenticatedContextValue = {
    isAuthenticated: boolean;
    user: AuthUser | null;
};

export type AuthenticatedContextProviderProps = {
    value: AuthenticatedContextValue;
    children: ReactNode;
};

export type AuthenticatedProviderProps = {
    children: ReactNode | ((value: AuthenticatedContextValue) => ReactNode);
};

/** The signed-in user as exposed to the app (from Better Auth's session). */
export type AuthUser = {
    id: string;
    email: string;
    name: string | null;
    image?: string | null;
    avatar?: string | null;
    twoFactorEnabled?: boolean | null;
};

export type TwoFactorAwareUser = {
    twoFactorEnabled?: boolean | null;
};

export type AppRouter = ReturnType<typeof useRouter>;
