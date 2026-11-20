import {
    decryptVariable,
    encryptVariable,
    generateEnvironmentKey,
    generateEnvironmentKeyId,
    openEnvironmentKey,
    sealEnvironmentKey,
    wipeEnvironmentKey,
} from "@/lib/crypto/environment";
import { getPublicAccountKeys } from "@/lib/crypto/keyring";
import type {
    AccountKeys,
    EncryptedVariable,
    EnvironmentKeyMaterial,
    PlainVariable,
} from "@/types/crypto";
import type {
    KeyRecipient,
    RotateEnvironmentKeyInput,
    RotationBundle,
} from "@/types/environment-key";
import type {
    NewEnvironmentKeyInput,
    ProjectEnvFile,
    ProjectEnvVariable,
    ProjectEnvironmentKey,
} from "@/types/project";
import type { EnvironmentTypeValue } from "@/types/workspace";

export async function createEnvironmentKeyForSelf(input: {
    environment: EnvironmentTypeValue;
    keys: AccountKeys;
    userId: string;
}): Promise<{ request: NewEnvironmentKeyInput; material: EnvironmentKeyMaterial }> {
    const { boxPublicKey } = await getPublicAccountKeys(input.keys);
    const id = await generateEnvironmentKeyId();
    const material = await generateEnvironmentKey();
    const share = await sealEnvironmentKey({
        key: material,
        context: {
            environmentKeyId: id,
            version: 1,
            recipientUserId: input.userId,
            recipientBoxPublicKey: boxPublicKey,
        },
        signer: input.keys,
    });

    return {
        request: {
            id,
            environment: input.environment,
            ...share,
        },
        material,
    };
}

export async function createEnvironmentKeysForSelf(input: {
    environments: EnvironmentTypeValue[];
    keys: AccountKeys;
    userId: string;
}) {
    const created = await Promise.all(
        input.environments.map((environment) =>
            createEnvironmentKeyForSelf({ environment, keys: input.keys, userId: input.userId })
        )
    );

    await Promise.all(created.map(({ material }) => wipeEnvironmentKey(material)));

    return created.map(({ request }) => request);
}

export async function openProjectEnvironmentKey(input: {
    environmentKey: ProjectEnvironmentKey;
    keys: AccountKeys;
    userId: string;
}) {
    const share = input.environmentKey.share;

    if (!share || share.version !== input.environmentKey.version) {
        return null;
    }

    return openEnvironmentKey({
        share: {
            sealedSecret: share.sealedSecret,
            signature: share.signature,
        },
        context: {
            environmentKeyId: input.environmentKey.id,
            version: share.version,
            recipientUserId: input.userId,
            recipientBoxPublicKey: share.recipientBoxPublicKey,
        },
        signerSignPublicKey: share.granter.signPublicKey,
        recipient: input.keys,
    });
}

export async function decryptEnvFileVariables(input: {
    envFile: ProjectEnvFile;
    material: EnvironmentKeyMaterial;
}): Promise<ProjectEnvVariable[]> {
    return Promise.all(
        input.envFile.variables.map(async (variable) => {
            const plain = await decryptVariable({
                variable,
                envFileId: input.envFile.id,
                key: input.material,
            });

            return {
                id: variable.id,
                key: plain.key,
                value: plain.value,
                note: plain.note,
                isCommented: plain.isCommented,
                position: variable.position,
                createdAt: variable.createdAt,
                updatedAt: variable.updatedAt,
            };
        })
    );
}

function isUnchanged(plain: PlainVariable, existing: ProjectEnvVariable | undefined) {
    return Boolean(
        existing
        && existing.key === plain.key
        && existing.value === plain.value
        && (existing.note ?? null) === (plain.note ?? null)
        && existing.isCommented === plain.isCommented
    );
}

export async function encryptEnvFileVariables(input: {
    envFile: ProjectEnvFile;
    plainVariables: PlainVariable[];
    currentVariables: ProjectEnvVariable[];
    keyVersion: number;
    material: EnvironmentKeyMaterial;
}): Promise<EncryptedVariable[]> {
    const currentByKey = new Map(input.currentVariables.map((variable) => [variable.key, variable]));
    const cipherById = new Map(input.envFile.variables.map((variable) => [variable.id, variable]));

    return Promise.all(
        input.plainVariables.map(async (plain) => {
            const existing = currentByKey.get(plain.key);
            const existingCipher = existing ? cipherById.get(existing.id) : undefined;

            if (
                existingCipher
                && existingCipher.keyVersion === input.keyVersion
                && isUnchanged(plain, existing)
            ) {
                return {
                    keyDigest: existingCipher.keyDigest,
                    encryptedKey: existingCipher.encryptedKey,
                    encryptedValue: existingCipher.encryptedValue,
                    encryptedNote: existingCipher.encryptedNote,
                    isCommented: existingCipher.isCommented,
                    keyVersion: existingCipher.keyVersion,
                };
            }

            return encryptVariable({
                variable: plain,
                envFileId: input.envFile.id,
                keyVersion: input.keyVersion,
                key: input.material,
            });
        })
    );
}

export async function sealEnvironmentKeyFor(input: {
    environmentKeyId: string;
    version: number;
    material: EnvironmentKeyMaterial;
    recipient: KeyRecipient;
    keys: AccountKeys;
}) {
    return sealEnvironmentKey({
        key: input.material,
        context: {
            environmentKeyId: input.environmentKeyId,
            version: input.version,
            recipientUserId: input.recipient.userId,
            recipientBoxPublicKey: input.recipient.boxPublicKey,
        },
        signer: input.keys,
    });
}

export async function buildEnvironmentKeyRotation(input: {
    bundle: RotationBundle;
    currentMaterial: EnvironmentKeyMaterial;
    keys: AccountKeys;
}): Promise<{ body: RotateEnvironmentKeyInput; material: EnvironmentKeyMaterial }> {
    const nextVersion = input.bundle.environmentKey.version + 1;
    const material = await generateEnvironmentKey();

    try {
        const envFiles = await Promise.all(
            input.bundle.envFiles.map(async (envFile) => ({
                id: envFile.id,
                expectedVariableIds: envFile.variables.map((variable) => variable.id),
                variables: await Promise.all(
                    envFile.variables.map(async (variable) =>
                        encryptVariable({
                            variable: await decryptVariable({
                                variable,
                                envFileId: envFile.id,
                                key: input.currentMaterial,
                            }),
                            envFileId: envFile.id,
                            keyVersion: nextVersion,
                            key: material,
                        })
                    )
                ),
            }))
        );
        const shares = await Promise.all(
            input.bundle.recipients.map(async (recipient) => ({
                userId: recipient.userId,
                ...(await sealEnvironmentKeyFor({
                    environmentKeyId: input.bundle.environmentKey.id,
                    version: nextVersion,
                    material,
                    recipient,
                    keys: input.keys,
                })),
            }))
        );

        return {
            body: {
                expectedVersion: input.bundle.environmentKey.version,
                shares,
                envFiles,
            },
            material,
        };
    } catch (error) {
        await wipeEnvironmentKey(material);
        throw error;
    }
}
