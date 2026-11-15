export type CliAuthenticatedUser = {
    id: string;
    email: string;
    name: string | null;
};

export type CliAuthenticationResult =
    | {
        status: "OK";
        tokenId: string;
        tokenName: string;
        expiresAt: Date | null;
        user: CliAuthenticatedUser;
    }
    | {
        status: "UNAUTHORIZED";
    };

export type CreateCliLoginRequestInput = {
    tokenHash: string;
    tokenPrefix: string;
    tokenName: string;
};

export type CreateCliLoginRequestRecordInput = CreateCliLoginRequestInput & {
    pollSecretHash: string;
    expiresAt: Date;
};

export type GetCliLoginRequestStatusInput = {
    requestId: string;
    pollSecret: string;
};

export type FindCliLoginRequestForPollingInput = {
    requestId: string;
    pollSecretHash: string;
};

export type ApproveCliLoginRequestInput = {
    requestId: string;
    userId: string;
};

export type AuthenticateCliTokenRecordInput = {
    tokenHash: string;
    usedAt: Date;
};

export type RevokeCliTokenRecordInput = {
    tokenId: string;
    revokedAt: Date;
};

export type CreateCliLoginRequestBody = {
    tokenHash?: unknown;
    tokenPrefix?: unknown;
    tokenName?: unknown;
};

export type CliLoginRequestRouteContext = {
    params: Promise<{
        requestId: string;
    }>;
};

export type AuthorizeCliPageProps = CliLoginRequestRouteContext;

export type AuthorizeCliClientProps = {
    requestId: string;
    tokenName: string;
    userEmail: string;
    isAlreadyApproved: boolean;
};

export type CliApprovalResponse = {
    error?: string;
};

export type CliSession = {
    id: string;
    name: string;
    tokenPrefix: string;
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
};

export type CliSessionsResponse = {
    sessions: CliSession[];
};

export type CliTokenRouteContext = {
    params: Promise<{
        tokenId: string;
    }>;
};
