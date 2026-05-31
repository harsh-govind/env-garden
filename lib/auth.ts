import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import {
    DEFAULT_AVATAR_PRESET_ID,
    isAvatarPresetId,
} from "@/lib/avatar-presets";
import {
    createUserFromAuth,
    findUserByEmail,
    updateUserName,
} from "@/prisma/services/user";

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

            const existing = await findUserByEmail(email);

            if (!existing) {
                const created = await createUserFromAuth({
                    email,
                    name: name || null,
                });

                token.sub = created.id;
                token.avatar = isAvatarPresetId(created.avatar)
                    ? created.avatar
                    : DEFAULT_AVATAR_PRESET_ID;
                return token;
            }

            if (name && name !== existing.name) {
                await updateUserName(existing.id, name);
            }

            token.sub = existing.id;
            token.avatar = isAvatarPresetId(existing.avatar)
                ? existing.avatar
                : DEFAULT_AVATAR_PRESET_ID;
            return token;
        },
        async session({ session, token }) {
            if (session.user && typeof token.sub === "string") {
                session.user.id = token.sub;

                if (
                    typeof token.avatar === "string"
                    && isAvatarPresetId(token.avatar)
                ) {
                    session.user.avatar = token.avatar;
                }
            }

            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export function auth() {
    return getServerSession(authOptions);
}
