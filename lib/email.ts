import "server-only";
import { Resend } from "resend";

export type InviteEmailInput = {
    to: string;
    workspaceName: string;
    invitedByEmail: string;
    inviteUrl: string;
};

export type MagicLinkEmailInput = {
    to: string;
    magicLinkUrl: string;
    expiresAt: Date;
};

export type EmailSendResult =
    | { status: "SENT" }
    | { status: "NOT_CONFIGURED" }
    | { status: "FAILED"; error: string };

function getEmailDomain() {
    return process.env.EMAIL_DOMAIN?.trim().replace(/^@/, "") || null;
}

export function getEmailFromAddress(localPart: "auth" | "invite") {
    const domain = getEmailDomain();

    return domain ? `${localPart}@${domain}` : null;
}

export async function sendWorkspaceInviteEmail(
    input: InviteEmailInput
): Promise<EmailSendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = getEmailFromAddress("invite");

    if (process.env.NODE_ENV !== "production") {
        console.log(`--\n[INVITE LINK]: ${input.inviteUrl}\n--`);
        return { status: "SENT" };
    }

    if (!apiKey || !from) {
        return { status: "NOT_CONFIGURED" };
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
        from,
        to: input.to,
        subject: `Join ${input.workspaceName} on env.garden`,
        text: [
            `${input.invitedByEmail} invited you to ${input.workspaceName} on env.garden.`,
            "",
            `Accept the invitation: ${input.inviteUrl}`,
            "",
            "This invitation is tied to your email address.",
        ].join("\n"),
    });

    if (error) {
        return {
            status: "FAILED",
            error: error.message,
        };
    }

    return { status: "SENT" };
}

export async function sendSignInEmail(
    input: MagicLinkEmailInput
): Promise<EmailSendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = getEmailFromAddress("auth");

    if (process.env.NODE_ENV !== "production") {
        console.log(`--\n[MAGIC LINK]: ${input.magicLinkUrl}\n--`);
        return { status: "SENT" };
    }

    if (!apiKey || !from) {
        return { status: "NOT_CONFIGURED" };
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
        from,
        to: input.to,
        subject: "Sign in to env.garden",
        text: [
            "Use this link to sign in to env.garden:",
            "",
            input.magicLinkUrl,
            "",
            `This link expires at ${input.expiresAt.toISOString()}.`,
            "If you did not request this, you can ignore this email.",
        ].join("\n"),
    });

    if (error) {
        return {
            status: "FAILED",
            error: error.message,
        };
    }

    return { status: "SENT" };
}
