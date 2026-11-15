"use client";

import { usePathname } from "next/navigation";
import AuthenticatedShell from "@/components/dashboard/authenticated-shell";
import { isStandaloneRoute } from "@/constants/routes";
import { WorkspaceProvider } from "@/contexts/workspace";
import type { AuthenticatedLayoutProps } from "@/types/layouts";

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    const pathname = usePathname();

    if (isStandaloneRoute(pathname)) {
        return <>{children}</>;
    }

    return (
        <WorkspaceProvider>
            <AuthenticatedShell>{children}</AuthenticatedShell>
        </WorkspaceProvider>
    );
}
