import { AuthenticatedContextProvider } from "@/contexts/authenticated";
import { getSession } from "@/lib/auth";
import type { AuthenticatedProviderProps, AuthUser } from "@/types/auth";

export default async function AuthenticatedProvider({
    children,
}: AuthenticatedProviderProps) {
    const session = await getSession();
    const user: AuthUser | null = session
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name || null,
            image: session.user.image ?? null,
            avatar: session.user.avatar ?? null,
            twoFactorEnabled: session.user.twoFactorEnabled ?? false,
        }
        : null;
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
