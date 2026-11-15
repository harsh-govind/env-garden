import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { deleteSessionCookie } from "better-auth/cookies";
import { generateRandomString } from "better-auth/crypto";
import { nextCookies } from "better-auth/next-js";
import { magicLink, twoFactor } from "better-auth/plugins";
import { headers } from "next/headers";
import { APP_NAME } from "@/constants/app";
import {
    AUTH_SESSION_EXPIRES_IN_SECONDS,
    AUTH_SESSION_UPDATE_AGE_SECONDS,
    MAGIC_LINK_EXPIRES_IN_SECONDS,
    TWO_FACTOR_ATTEMPTS_IDENTIFIER_PREFIX,
    TWO_FACTOR_COOKIE_MAX_AGE_SECONDS,
    TWO_FACTOR_COOKIE_NAME,
    TWO_FACTOR_ENFORCED_PATH_PREFIXES,
    TWO_FACTOR_IDENTIFIER_PREFIX,
} from "@/constants/auth";
import { DEFAULT_AVATAR_PRESET_ID, getRandomAvatarPresetId } from "@/constants/avatar-presets";
import { TWO_FACTOR_PATH } from "@/constants/routes";
import { sendSignInEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import type { TwoFactorAwareUser } from "@/types/auth";

/**
 * Better Auth's 2FA plugin only challenges password sign-ins. env.garden signs
 * in with magic links and Google/GitHub, so this hook applies the same
 * challenge to those: drop the new session, set the plugin's signed
 * `two_factor` cookie, and send the user to enter a code. The plugin's own
 * verify endpoints then create the session.
 */
const enforceTwoFactorOnAllSignIns = createAuthMiddleware(async (ctx) => {
    const path = ctx.path ?? "";

    if (!TWO_FACTOR_ENFORCED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
        return;
    }

    const newSession = ctx.context.newSession;

    if (!(newSession?.user as TwoFactorAwareUser | undefined)?.twoFactorEnabled) {
        return;
    }

    deleteSessionCookie(ctx, true);
    await ctx.context.internalAdapter.deleteSession(newSession!.session.token);
    ctx.context.setNewSession(null);

    const identifier = `${TWO_FACTOR_IDENTIFIER_PREFIX}${generateRandomString(20)}`;
    const expiresAt = new Date(Date.now() + TWO_FACTOR_COOKIE_MAX_AGE_SECONDS * 1000);

    await ctx.context.internalAdapter.createVerificationValue({
        value: newSession!.user.id,
        identifier,
        expiresAt,
    });
    await ctx.context.internalAdapter.createVerificationValue({
        value: "0",
        identifier: `${TWO_FACTOR_ATTEMPTS_IDENTIFIER_PREFIX}${identifier}`,
        expiresAt,
    });

    const twoFactorCookie = ctx.context.createAuthCookie(TWO_FACTOR_COOKIE_NAME, {
        maxAge: TWO_FACTOR_COOKIE_MAX_AGE_SECONDS,
    });
    await ctx.setSignedCookie(twoFactorCookie.name, identifier, ctx.context.secret, twoFactorCookie.attributes);

    throw ctx.redirect(new URL(TWO_FACTOR_PATH, ctx.context.baseURL).toString());
});

export const auth = betterAuth({
    appName: APP_NAME,
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    user: {
        additionalFields: {
            avatar: {
                type: "string",
                required: false,
                defaultValue: DEFAULT_AVATAR_PRESET_ID,
                input: false,
            },
        },
    },
    session: {
        expiresIn: AUTH_SESSION_EXPIRES_IN_SECONDS,
        updateAge: AUTH_SESSION_UPDATE_AGE_SECONDS,
    },
    account: {
        accountLinking: {
            enabled: true,
            // No trustedProviders: Google/GitHub accounts link only when the
            // provider confirms the email address is verified.
            // Email magic link always works, so every provider can be disconnected.
            allowUnlinkingAll: true,
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID ?? "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        },
    },
    plugins: [
        magicLink({
            expiresIn: MAGIC_LINK_EXPIRES_IN_SECONDS,
            // Only a hash is stored, so a database read can't produce a working link.
            storeToken: "hashed",
            async sendMagicLink({ email, url }) {
                const result = await sendSignInEmail({
                    to: email,
                    magicLinkUrl: url,
                    expiresAt: new Date(Date.now() + MAGIC_LINK_EXPIRES_IN_SECONDS * 1000),
                });

                if (result.status === "NOT_CONFIGURED") {
                    throw new Error("Sign-in email is not configured.");
                }

                if (result.status === "FAILED") {
                    throw new Error(result.error);
                }
            },
        }),
        twoFactor({
            issuer: APP_NAME,
            allowPasswordless: true,
        }),
        nextCookies(),
    ],
    databaseHooks: {
        user: {
            create: {
                async before(user) {
                    return { data: { ...user, avatar: getRandomAvatarPresetId() } };
                },
            },
        },
    },
    hooks: {
        after: enforceTwoFactorOnAllSignIns,
    },
});

/** The signed-in user and session for the current request, or null. */
export async function getSession() {
    return auth.api.getSession({ headers: await headers() });
}
