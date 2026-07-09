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

export type EmailLocalPart = "auth" | "invite";

export type EmailSendResult =
    | { status: "SENT" }
    | { status: "NOT_CONFIGURED" }
    | { status: "FAILED"; error: string };
