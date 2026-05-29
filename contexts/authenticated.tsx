"use client";

import { createContext, useContext } from "react";
import type {
    AuthenticatedContextProviderProps,
    AuthenticatedContextValue,
} from "@/types/auth";

const AuthenticatedContext = createContext<AuthenticatedContextValue | null>(null);

export function AuthenticatedContextProvider({
    value,
    children,
}: AuthenticatedContextProviderProps) {
    return (
        <AuthenticatedContext.Provider value={value}>
            {children}
        </AuthenticatedContext.Provider>
    );
}

export function useAuthenticated() {
    const context = useContext(AuthenticatedContext);

    if (!context) {
        throw new Error("useAuthenticated must be used within AuthenticatedProvider.");
    }

    return context;
}
