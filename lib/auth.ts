import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export const authOptions: NextAuthOptions = {
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID ?? "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            const email =
                typeof token.email === "string"
                    ? normalizeEmail(token.email)
                    : null;
            const name = typeof user?.name === "string" ? user.name.trim() : null;

            if (!email) {
                return token;
            }

            const existing = await prisma.user.findUnique({
                where: { email },
            });

            if (!existing) {
                const created = await prisma.user.create({
                    data: {
                        email,
                        name: name || null,
                    },
                });

                token.sub = created.id;
                return token;
            }

            if (name && name !== existing.name) {
                await prisma.user.update({
                    where: { id: existing.id },
                    data: {
                        name,
                    },
                });
            }

            token.sub = existing.id;
            return token;
        },
        async session({ session, token }) {
            if (session.user && typeof token.sub === "string") {
                session.user.id = token.sub;
            }

            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export function auth() {
    return getServerSession(authOptions);
}
