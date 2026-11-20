"use client";

import { usePathname } from "next/navigation";
import AuthenticatedShell from "@/components/dashboard/authenticated-shell";
import VaultGate from "@/components/vault/vault-gate";
import { isStandaloneRoute } from "@/constants/routes";
import { VaultProvider } from "@/contexts/vault";
import { WorkspaceProvider } from "@/contexts/workspace";
import type { AuthenticatedLayoutProps } from "@/types/layouts";

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    const pathname = usePathname();

    return (
        <VaultProvider>
            {isStandaloneRoute(pathname) ? (
                children
            ) : (
                <WorkspaceProvider>
                    <AuthenticatedShell>
                        <VaultGate>{children}</VaultGate>
                    </AuthenticatedShell>
                </WorkspaceProvider>
            )}
        </VaultProvider>
    );
}
