"use client";

import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { UnauthenticatedLayoutProps } from "@/types/layouts";

export default function UnauthenticatedLayout({
    children,
}: UnauthenticatedLayoutProps) {
    const pathname = usePathname();

    // The landing page renders its own full-width layout.
    if (pathname === "/") {
        return <>{children}</>;
    }

    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-6 py-16">
            <Card className="w-full">
                <CardContent className="space-y-6">
                    {children}
                </CardContent>
            </Card>
        </main>
    );
}
