import type { ReactNode } from "react";
import type { Session } from "next-auth";

export type AuthButtonsProps = {
    isAuthenticated: boolean;
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
    user: Session["user"] | null;
};

export type AuthenticatedContextProviderProps = {
    value: AuthenticatedContextValue;
    children: ReactNode;
};

export type AuthenticatedProviderProps = {
    children: ReactNode | ((value: AuthenticatedContextValue) => ReactNode);
};
