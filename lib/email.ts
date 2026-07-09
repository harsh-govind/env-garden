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
    body,
    actionPrefix,
    actionUrl,
    noteLines,
}: {
    body: string[];
    actionPrefix: string;
    actionUrl: string;
    noteLines: string[];
}) {
    const safeActionUrl = escapeHtml(actionUrl);
    const paragraphs = body
        .map((line) => `<p style="margin:0 0 16px">${escapeHtml(line)}</p>`)
        .join("");
    const noteParagraphs = noteLines
        .map((line) => `<p style="margin:0 0 16px">${escapeHtml(line)}</p>`)
        .join("");

    return [
        "<!doctype html>",
        "<html>",
        "<body style=\"margin:0;padding:24px;background:#ffffff;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5\">",
        paragraphs,
        `<p style="margin:0 0 16px">${escapeHtml(actionPrefix)} <a href="${safeActionUrl}" style="color:#2563eb;text-decoration:underline">${safeActionUrl}</a></p>`,
        noteParagraphs,
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
        "",
        "Thanks",
    ].join("\n");
    const html = renderEmailHtml({
        body: [
            "Hi,",
            `${input.invitedByEmail} invited you to ${input.workspaceName} on ${EMAIL_SENDER_NAME}.`,
        ],
        actionPrefix: "Accept the invitation:",
        actionUrl: input.inviteUrl,
        noteLines: ["This invitation is tied to your email address."],
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
        `Sign in: ${input.magicLinkUrl}`,
        "",
        `This link expires at ${input.expiresAt.toISOString()}.`,
        "",
        "If you did not request this, you can ignore this email.",
        "",
        "Thanks",
    ].join("\n");
    const html = renderEmailHtml({
        body: [
            "Hi,",
            `Use this link to sign in to ${EMAIL_SENDER_NAME}.`,
        ],
        actionPrefix: "Sign in:",
        actionUrl: input.magicLinkUrl,
        noteLines: [
            `This link expires at ${input.expiresAt.toISOString()}.`,
            "If you did not request this, you can ignore this email.",
        ],
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
