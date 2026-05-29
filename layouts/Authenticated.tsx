"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useAuthenticated } from "@/contexts/authenticated-context";
import UnauthenticatedLayout from "@/layouts/Unauthenticated";
import ProtectedRouteProvider from "@/provider/protected-route-provider";
import type { AuthenticatedLayoutProps } from "@/types/layouts";

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    const { isAuthenticated } = useAuthenticated();

    return (
        <ProtectedRouteProvider isAuthenticated={isAuthenticated}>
            {isAuthenticated ? (
                <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
                    <Card>
                        <CardContent className="space-y-6">
                            {children}
                        </CardContent>
                    </Card>
                </main>
            ) : (
                <UnauthenticatedLayout>{children}</UnauthenticatedLayout>
            )}
        </ProtectedRouteProvider>
    );
}
