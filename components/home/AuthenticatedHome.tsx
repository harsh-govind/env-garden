import AuthButtons from "@/components/auth/auth-buttons";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AuthenticatedLayout from "@/layouts/Authenticated";
import type { AuthenticatedHomeProps } from "@/types/home";

export default function AuthenticatedHome({
    name,
    email,
}: AuthenticatedHomeProps) {
    return (
        <AuthenticatedLayout>
            <Badge className="uppercase">Authenticated</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                Home
            </h1>
            <p className="text-muted-foreground">
                Signed in as {name ?? "Unnamed user"}
                {email ? ` (${email})` : ""}
            </p>

            <div className="flex items-center justify-end">
                <AuthButtons isAuthenticated />
            </div>

            <Separator />

            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle>Welcome to env-garden</CardTitle>
                    <CardDescription>
                        This is your authenticated home page. You can now continue building
                        env management features here.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Your session is active and ready for secure environment operations.
                    </p>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
