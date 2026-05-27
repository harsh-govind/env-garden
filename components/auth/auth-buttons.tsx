"use client";

import { LogIn, LogOut } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import type { AuthButtonsProps } from "@/types/auth";

export default function AuthButtons({ isAuthenticated }: AuthButtonsProps) {
    if (isAuthenticated) {
        return (
            <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                variant="outline"
            >
                <LogOut />
                Sign out
            </Button>
        );
    }

    return (
        <Button
            onClick={() => signIn("github", { callbackUrl: "/" })}
        >
            <LogIn />
            Sign in with GitHub
        </Button>
    );
}
