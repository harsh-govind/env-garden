import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import {
    DEFAULT_AVATAR_PRESET_ID,
    isAvatarPresetId,
} from "@/constants/avatar-presets";
import {
    getEmailSenderAddress,
    sendSignInEmail,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { upsertUserFromAuth } from "@/prisma/services/user";

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        EmailProvider({
            from: getEmailSenderAddress("auth") ?? undefined,
            maxAge: 15 * 60,
            normalizeIdentifier(identifier) {
                return normalizeEmail(identifier.split(",")[0] ?? "");
            },
            async sendVerificationRequest({ identifier, url, expires }) {
                const result = await sendSignInEmail({
                    to: identifier,
                    magicLinkUrl: url,
                    expiresAt: expires,
                });

                if (result.status === "NOT_CONFIGURED") {
                    throw new Error("Sign-in email is not configured.");
                }

                if (result.status === "FAILED") {
                    throw new Error(result.error);
                }
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            allowDangerousEmailAccountLinking: true,
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID ?? "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user }) {
            return typeof user.email === "string" && Boolean(user.email.trim());
        },
        async jwt({ token, user }) {
            const rawEmail =
                typeof user?.email === "string"
                    ? user.email
                    : typeof token.email === "string"
                        ? token.email
                        : null;
            const email = rawEmail ? normalizeEmail(rawEmail) : null;
            const rawName =
                typeof user?.name === "string"
                    ? user.name
                    : typeof token.name === "string"
                        ? token.name
                        : null;
            const name = rawName?.trim() || null;

            if (!email) {
                return token;
            }

            const authUser = await upsertUserFromAuth({
                email,
                name,
            });

            token.email = authUser.email;
            token.name = authUser.name ?? token.name;
            token.sub = authUser.id;
            token.avatar = isAvatarPresetId(authUser.avatar)
                ? authUser.avatar
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
        async redirect({ url, baseUrl }) {
            if (url.startsWith("/")) {
                return `${baseUrl}${url}`;
            }

            try {
                const parsedUrl = new URL(url);

                if (parsedUrl.origin === baseUrl) {
                    return url;
                }
            } catch {
                return baseUrl;
            }

            return baseUrl;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export function auth() {
    return getServerSession(authOptions);
}
