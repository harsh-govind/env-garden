import { Card, CardContent } from "@/components/ui/card";
import type { AuthenticatedLayoutProps } from "@/types/layouts";

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    return (
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
            <Card>
                <CardContent className="space-y-6">
                    {children}
                </CardContent>
            </Card>
        </main>
    );
}
