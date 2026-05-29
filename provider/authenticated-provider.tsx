import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthenticatedContextProvider } from "@/contexts/authenticated-context";
import type { AuthenticatedProviderProps } from "@/types/auth";

export default async function AuthenticatedProvider({
    children,
}: AuthenticatedProviderProps) {
    const session = await getServerSession(authOptions);
    const user = session?.user ?? null;

    return (
        <AuthenticatedContextProvider
            value={{
                isAuthenticated: Boolean(user),
                user,
            }}
        >
            {children}
        </AuthenticatedContextProvider>
    );
}
