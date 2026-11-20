import type { EncryptedVariable } from "@/types/crypto";
import type {
    ProjectEnvVariableCipher,
    ProjectEnvironmentKey,
} from "@/types/project";
import type { EnvironmentTypeValue } from "@/types/workspace";

export type KeyRecipient = {
    userId: string;
    email: string;
    name: string | null;
    signPublicKey: string;
    boxPublicKey: string;
};

export type EnvironmentKeyAccess = {
    id: string;
    projectId: string;
    projectName: string;
    environment: EnvironmentTypeValue;
    version: number;
    rotationRequired: boolean;
    holdsKey: boolean;
    canRotate: boolean;
    holderCount: number;
    pendingRecipients: KeyRecipient[];
};

export type EnvironmentKeyAccessResponse = {
    keys: EnvironmentKeyAccess[];
};

export type GrantEnvironmentKeyBody = {
    recipientUserId?: unknown;
    version?: unknown;
    sealedSecret?: unknown;
    signature?: unknown;
};

export type RotationBundle = {
    environmentKey: ProjectEnvironmentKey;
    envFiles: {
        id: string;
        variables: ProjectEnvVariableCipher[];
    }[];
    recipients: KeyRecipient[];
};

export type RotationBundleResponse = RotationBundle;

export type RotateEnvironmentKeyInput = {
    expectedVersion: number;
    shares: {
        userId: string;
        sealedSecret: string;
        signature: string;
    }[];
    envFiles: {
        id: string;
        expectedVariableIds: string[];
        variables: EncryptedVariable[];
    }[];
};

export type RotateEnvironmentKeyBody = {
    expectedVersion?: unknown;
    shares?: unknown;
    envFiles?: unknown;
};

export type EnvironmentKeyRouteContext = {
    params: Promise<{
        workspaceId: string;
        keyId: string;
    }>;
};

export type KeyAccessBarProps = {
    access: EnvironmentKeyAccess | null;
    viewerUserId: string;
    busyRecipientId: string | null;
    isRotating: boolean;
    onShare: (recipient: KeyRecipient) => void;
    onRotate: () => void;
};

export type PendingRecipientRowProps = {
    recipient: KeyRecipient;
    viewerUserId: string;
    isBusy: boolean;
    isDisabled: boolean;
    onShare: (recipient: KeyRecipient) => void;
};

export type PendingKeyRequestsNoticeProps = {
    workspaceId: string;
};
