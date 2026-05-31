"use client";

import { Mail, UserRound } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useAuthenticated } from "@/contexts/authenticated";

export default function ProfilePage() {
    const { user } = useAuthenticated();

    return (
        <section className="mx-auto max-w-2xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
                <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Account information for your current session.
                </p>
            </div>

            <div className="space-y-3 px-4 py-4">
                <div className="border border-border bg-muted/30 px-3 py-2">
                    <p className="inline-flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                        <UserRound className="size-3.5" />
                        Name
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                        {user?.name ?? "Not available"}
                    </p>
                </div>

                <div className="border border-border bg-muted/30 px-3 py-2">
                    <p className="inline-flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                        <Mail className="size-3.5" />
                        Email
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                        {user?.email ?? "Not available"}
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                        void signOut({ callbackUrl: "/" });
                    }}
                >
                    Logout
                </Button>
            </div>
        </section>
    );
}
