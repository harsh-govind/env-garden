import AuthButtons from "@/components/auth/auth-buttons";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import UnauthenticatedLayout from "@/layouts/Unauthenticated";

export default function UnauthenticatedHome() {
    return (
        <UnauthenticatedLayout>
            <Badge variant="outline" className="uppercase">
                Unauthenticated
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
                env-garden
            </h1>
            <p className="text-muted-foreground">
                Please sign in with GitHub to access your home page.
            </p>

            <Separator />

            <div>
                <AuthButtons isAuthenticated={false} />
            </div>
        </UnauthenticatedLayout>
    );
}
