import type { ReactNode } from "react";
import type { AccountKeys, EncryptedKeyringPayload } from "@/types/crypto";

export type VaultStatus = "loading" | "error" | "missing" | "locked" | "unlocked";

export type VaultKeyring = EncryptedKeyringPayload & {
    createdAt: string;
    updatedAt: string;
};

export type VaultContextValue = {
    status: VaultStatus;
    error: string | null;
    keyring: VaultKeyring | null;
    keys: AccountKeys | null;
    fingerprint: string | null;
    reload: () => Promise<void>;
    createKeyring: (keys: AccountKeys, passphrase: string) => Promise<void>;
    unlock: (passphrase: string) => Promise<void>;
    recover: (recoveryPhrase: string, newPassphrase: string) => Promise<void>;
    changePassphrase: (newPassphrase: string) => Promise<void>;
    resetKeys: (keys: AccountKeys, passphrase: string) => Promise<void>;
    lock: () => void;
};

export type VaultProviderProps = {
    children: ReactNode;
};

export type VaultGateProps = {
    children: ReactNode;
};

export type StoredVaultSession = {
    userId: string;
    iv: string;
    data: string;
    expiresAt: number;
};

export type RecoveryPhraseGridProps = {
    phrase: string;
};

export type RecoveryPhraseConfirmProps = {
    phrase: string;
    onConfirmed: () => void;
    onBack: () => void;
};

export type PassphraseFormProps = {
    submitLabel: string;
    isPending: boolean;
    requireConfirmation?: boolean;
    autoFocus?: boolean;
    onSubmit: (passphrase: string) => void;
};

export type VaultSetupProps = {
    mode: "setup" | "reset";
    onCancel?: () => void;
    onComplete?: () => void;
};

export type VaultSetupStep = "intro" | "phrase" | "confirm" | "passphrase";

export type VaultUnlockMode = "passphrase" | "recover" | "reset";

export type VaultPanelProps = {
    title: string;
    description: string;
    children: ReactNode;
};

export type KeyTrust = "new" | "pinned" | "changed";

export type KeyPin = {
    signPublicKey: string;
    boxPublicKey: string | null;
    pinnedAt: string;
};
