import type {
    ProjectDetail,
    ProjectDetailRecord,
    ProjectEnvFile,
    ProjectEnvFileRecord,
    ProjectEnvVariableCipher,
    ProjectEnvVariableCipherRecord,
    ProjectEnvironmentKey,
    ProjectEnvironmentKeyRecord,
} from "@/types/project";
import { findMostRecentUpdatedAt } from "@/utils/time/updated-at";

export function serializeProjectEnvVariableCipher(
    record: ProjectEnvVariableCipherRecord
): ProjectEnvVariableCipher {
    return {
        id: record.id,
        keyDigest: record.keyDigest,
        encryptedKey: record.encryptedKey,
        encryptedValue: record.encryptedValue,
        encryptedNote: record.encryptedNote,
        keyVersion: record.keyVersion,
        isCommented: record.isCommented,
        position: record.position,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export function serializeProjectEnvironmentKey(
    record: ProjectEnvironmentKeyRecord
): ProjectEnvironmentKey {
    return {
        id: record.id,
        environment: record.environment,
        version: record.version,
        rotationRequired: record.rotationRequired,
        share: record.share
            ? {
                version: record.share.version,
                recipientBoxPublicKey: record.share.recipientBoxPublicKey,
                sealedSecret: record.share.sealedSecret,
                signature: record.share.signature,
                granter: {
                    userId: record.share.granter.userId,
                    email: record.share.granter.email,
                    signPublicKey: record.share.granter.signPublicKey,
                },
            }
            : null,
    };
}

export function serializeProjectEnvFile(
    record: ProjectEnvFileRecord
): ProjectEnvFile {
    const updatedAt =
        findMostRecentUpdatedAt(record, record.variables) ?? record.updatedAt;

    return {
        id: record.id,
        name: record.name,
        environment: record.environment,
        description: record.description,
        variableCount: record.variableCount,
        createdAt: record.createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        variables: record.variables.map(serializeProjectEnvVariableCipher),
    };
}

export function serializeProjectDetail(record: ProjectDetailRecord): ProjectDetail {
    const envFiles = record.envFiles.map(serializeProjectEnvFile);
    const updatedAt =
        findMostRecentUpdatedAt(record, envFiles) ?? record.updatedAt;

    return {
        id: record.id,
        workspaceId: record.workspaceId,
        name: record.name,
        description: record.description,
        role: record.role,
        canManage: record.canManage,
        createdAt: record.createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        envFiles,
        environmentKeys: record.environmentKeys.map(serializeProjectEnvironmentKey),
    };
}
