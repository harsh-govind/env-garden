import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthenticatedContextProvider } from "@/contexts/authenticated-context";
import type { AuthenticatedProviderProps } from "@/types/auth";

export default async function AuthenticatedProvider({
    children,
}: AuthenticatedProviderProps) {
    const session = await getServerSession(authOptions);
    const user = session?.user ?? null;
    const value = {
        isAuthenticated: Boolean(user),
        user,
    };

    const content = typeof children === "function" ? children(value) : children;

    return (
        <AuthenticatedContextProvider value={value}>
            {content}
        </AuthenticatedContextProvider>
    );
}
