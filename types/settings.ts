import type { ReactNode } from "react";

export type SettingsLayoutProps = {
    children: ReactNode;
};

export type SettingsTab = {
    label: string;
    href: string;
};

export type AppSessionSummary = {
    token: string;
    device: string;
    ipAddress: string | null;
    createdAt: string;
    lastActiveAt: string;
    isCurrent: boolean;
};

export type TwoFactorSetup = {
    totpURI: string;
    secret: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
};

export type CodeFormProps = {
    label: string;
    submitLabel: string;
    isPending: boolean;
    onSubmit: (code: string) => void;
};

export type BackupCodesListProps = {
    codes: string[];
};

export type SecurityAction = "idle" | "setup" | "backup-codes" | "disable" | "regenerate";
