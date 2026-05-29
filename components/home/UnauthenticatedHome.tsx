"use client";

import AuthButtons from "@/components/auth/auth-buttons";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function UnauthenticatedHome() {
    return (
        <>
            <Badge variant="outline" className="uppercase">
                Unauthenticated
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                env-garden
            </h1>
            <p className="text-muted-foreground">
                Please sign in with GitHub to access your home page.
            </p>

            <Separator />

            <div>
                <AuthButtons isAuthenticated={false} />
            </div>
        </>
    );
}
