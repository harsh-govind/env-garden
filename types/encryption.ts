export type EncryptedValuePayload = {
    encryptedValue: string;
    iv: string;
    authTag: string;
};

export type EncryptedProjectKeyPayload = {
    encryptedKey: string;
    iv: string;
    authTag: string;
};

export type ProjectEncryptionKeyRecord = EncryptedProjectKeyPayload & {
    id: string;
    projectId: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
};
