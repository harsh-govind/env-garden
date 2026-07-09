import "server-only";
import { Resend } from "resend";
import { EMAIL_SENDER_NAME } from "@/constants/email";
import type {
    EmailLocalPart,
    EmailSendResult,
    InviteEmailInput,
    MagicLinkEmailInput,
} from "@/types/email";

function getEmailDomain() {
    return process.env.EMAIL_DOMAIN?.trim().replace(/^@/, "") || null;
}

export function getEmailFromAddress(localPart: EmailLocalPart) {
    const domain = getEmailDomain();

    return domain ? `${localPart}@${domain}` : null;
}

export function getEmailSenderAddress(localPart: EmailLocalPart) {
    const address = getEmailFromAddress(localPart);

    return address ? `${EMAIL_SENDER_NAME} <${address}>` : null;
}

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => {
        switch (character) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "\"":
                return "&quot;";
            case "'":
                return "&#39;";
            default:
                return character;
        }
    });
}

function renderEmailHtml({
    heading,
    body,
    actionLabel,
    actionUrl,
    note,
}: {
    heading: string;
    body: string[];
    actionLabel: string;
    actionUrl: string;
    note: string;
}) {
    const safeHeading = escapeHtml(heading);
    const safeActionUrl = escapeHtml(actionUrl);
    const paragraphs = body
        .map((line) => `<p style="margin:0 0 16px">${escapeHtml(line)}</p>`)
        .join("");

    return [
        "<!doctype html>",
        "<html>",
        "<body style=\"margin:0;padding:24px;background:#ffffff;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5\">",
        `<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3">${safeHeading}</h1>`,
        paragraphs,
        `<p style="margin:0 0 18px"><a href="${safeActionUrl}" style="color:#2563eb;text-decoration:underline">${escapeHtml(actionLabel)}</a></p>`,
        `<p style="margin:0 0 16px">${escapeHtml(note)}</p>`,
        '<p style="margin:24px 0 0;color:#4b5563">Thanks</p>',
        "</body>",
        "</html>",
    ].join("");
}

export async function sendWorkspaceInviteEmail(
    input: InviteEmailInput
): Promise<EmailSendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = getEmailSenderAddress("invite");

    if (process.env.NODE_ENV !== "production") {
        console.log(`--\n[INVITE LINK]: ${input.inviteUrl}\n--`);
        return { status: "SENT" };
    }

    if (!apiKey || !from) {
        return { status: "NOT_CONFIGURED" };
    }

    const text = [
        "Hi,",
        "",
        `${input.invitedByEmail} invited you to ${input.workspaceName} on ${EMAIL_SENDER_NAME}.`,
        "",
        `Accept the invitation: ${input.inviteUrl}`,
        "",
        "This invitation is tied to your email address.",
    ].join("\n");
    const html = renderEmailHtml({
        heading: `Join ${input.workspaceName} on ${EMAIL_SENDER_NAME}`,
        body: [
            "Hi,",
            `${input.invitedByEmail} invited you to ${input.workspaceName} on ${EMAIL_SENDER_NAME}.`,
        ],
        actionLabel: "Accept the invitation",
        actionUrl: input.inviteUrl,
        note: "This invitation is tied to your email address.",
    });

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
        from,
        to: input.to,
        subject: `Join ${input.workspaceName} on ${EMAIL_SENDER_NAME}`,
        text,
        html,
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
    const from = getEmailSenderAddress("auth");

    if (process.env.NODE_ENV !== "production") {
        console.log(`--\n[MAGIC LINK]: ${input.magicLinkUrl}\n--`);
        return { status: "SENT" };
    }

    if (!apiKey || !from) {
        return { status: "NOT_CONFIGURED" };
    }

    const text = [
        "Hi,",
        "",
        `Use this link to sign in to ${EMAIL_SENDER_NAME}:`,
        "",
        input.magicLinkUrl,
        "",
        `This link expires at ${input.expiresAt.toISOString()}.`,
        "",
        "If you did not request this, you can ignore this email.",
    ].join("\n");
    const html = renderEmailHtml({
        heading: `Sign in to ${EMAIL_SENDER_NAME}`,
        body: [
            "Hi,",
            `Use this link to sign in to ${EMAIL_SENDER_NAME}.`,
        ],
        actionLabel: "Sign in",
        actionUrl: input.magicLinkUrl,
        note: `This link expires at ${input.expiresAt.toISOString()}. If you did not request this, you can ignore this email.`,
    });

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
        from,
        to: input.to,
        subject: `Sign in to ${EMAIL_SENDER_NAME}`,
        text,
        html,
    });

    if (error) {
        return {
            status: "FAILED",
            error: error.message,
        };
    }

    return { status: "SENT" };
}
