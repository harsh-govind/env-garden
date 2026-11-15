import type { ReactNode } from "react";

export type SettingsLayoutProps = {
    children: ReactNode;
};

export type SettingsTab = {
    label: string;
    href: string;
};

export type AppSessionSummary = {
    id: string;
    device: string;
    ipAddress: string | null;
    createdAt: string;
    lastSeenAt: string;
    isCurrent: boolean;
};

export type AppSessionsResponse = {
    sessions: AppSessionSummary[];
};

export type AppSessionRouteContext = {
    params: Promise<{
        sessionId: string;
    }>;
};

export type CreateAppSessionInput = {
    userId: string;
    userAgent: string | null;
    ipAddress: string | null;
};

export type RequestClientInfo = {
    userAgent: string | null;
    ipAddress: string | null;
};

export type RevokeAppSessionInput = {
    userId: string;
    sessionId: string;
};

export type RevokeOtherAppSessionsInput = {
    userId: string;
    currentSessionId: string | undefined;
};

export type ResolveAppSessionInput = {
    userId: string;
    sessionId: string | undefined;
    isSignIn: boolean;
};

export type UpsertLegacyAppSessionInput = CreateAppSessionInput & {
    sessionId: string;
};
