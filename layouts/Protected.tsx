import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { protectedRoutes } from "@/lib/constants";

type ProtectedLayoutProps = {
    pathname: string;
    children: ReactNode;
};

export default async function ProtectedLayout({
    pathname,
    children,
}: ProtectedLayoutProps) {
    const matchedRoute = protectedRoutes.find((route) => route.path === pathname);

    if (matchedRoute) {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            redirect(matchedRoute.redirectTo);
        }
    }

    return <>{children}</>;
}