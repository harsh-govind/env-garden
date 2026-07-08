"use client";

import AuthenticatedShell from "@/components/dashboard/authenticated-shell";
import { WorkspaceProvider } from "@/contexts/workspace";
import type { AuthenticatedLayoutProps } from "@/types/layouts";

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    return (
        <WorkspaceProvider>
            <AuthenticatedShell>{children}</AuthenticatedShell>
        </WorkspaceProvider>
    );
}
