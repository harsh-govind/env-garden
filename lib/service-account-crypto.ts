import { CLI_TOKEN_PREFIX, CLI_TOKEN_SECRET_BYTE_LENGTH } from "@/constants/cli";
import { SERVICE_ACCOUNT_TOKEN_SEPARATOR } from "@/constants/service-account";
import { splitAccountKeyForCli } from "@/lib/crypto/cli";
import { toBase64Url, wipe } from "@/lib/crypto/encoding";
import {
    generateAccountKeys,
    getPublicAccountKeys,
    openSealedAccountSeed,
    sealAccountSeed,
    wipeAccountKeys,
} from "@/lib/crypto/keyring";
import { loadSodium } from "@/lib/crypto/sodium";
import type { AccountKeys } from "@/types/crypto";
import type { ServiceAccountSummary } from "@/types/service-account";

export async function createServiceAccountKeys(holder: AccountKeys) {
    const serviceAccountKeys = await generateAccountKeys();

    try {
        const publicKeys = await getPublicAccountKeys(serviceAccountKeys);
        const holderPublicKeys = await getPublicAccountKeys(holder);

        return {
            ...publicKeys,
            sealedSeed: await sealAccountSeed(serviceAccountKeys.seed, holderPublicKeys.boxPublicKey),
        };
    } finally {
        await wipeAccountKeys(serviceAccountKeys);
    }
}

async function sha256Hex(value: string) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function mintServiceAccountToken(input: {
    serviceAccount: ServiceAccountSummary;
    holder: AccountKeys;
}) {
    if (!input.serviceAccount.sealedSeed) {
        throw new Error("Only the person who created this service account can issue its tokens.");
    }

    const sodium = await loadSodium();
    const serviceAccountKeys = await openSealedAccountSeed({
        sealedSeed: input.serviceAccount.sealedSeed,
        recipient: input.holder,
        expected: {
            signPublicKey: input.serviceAccount.signPublicKey,
            boxPublicKey: input.serviceAccount.boxPublicKey,
        },
    });
    const secret = sodium.randombytes_buf(CLI_TOKEN_SECRET_BYTE_LENGTH);
    const token = `${CLI_TOKEN_PREFIX}${toBase64Url(sodium, secret)}`;
    wipe(sodium, secret);
    const tokenHash = await sha256Hex(token);
    let shares: Awaited<ReturnType<typeof splitAccountKeyForCli>> | null = null;

    try {
        shares = await splitAccountKeyForCli({ keys: serviceAccountKeys, tokenHash });

        return {
            request: {
                tokenHash,
                tokenPrefix: token.slice(0, 12),
                encryptedServerShare: shares.encryptedServerShare,
            },
            fullToken: [
                token,
                toBase64Url(sodium, shares.clientShare),
                toBase64Url(sodium, shares.wrapKey),
            ].join(SERVICE_ACCOUNT_TOKEN_SEPARATOR),
        };
    } finally {
        if (shares) {
            wipe(sodium, shares.clientShare, shares.wrapKey);
        }

        await wipeAccountKeys(serviceAccountKeys);
    }
}
