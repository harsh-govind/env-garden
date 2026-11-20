import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    combineCliAccountKey,
    computeVerificationCode,
    generateCliTransportKeyPair,
    openCliPackage,
    sealCliPackage,
    splitAccountKeyForCli,
} from "@/lib/crypto/cli";
import {
    computeKeyDigest,
    decryptVariable,
    deriveEnvironmentKey,
    encryptVariable,
    generateEnvironmentKey,
    generateEnvironmentKeyId,
    openEnvironmentKey,
    sealEnvironmentKey,
} from "@/lib/crypto/environment";
import {
    computeFingerprint,
    decryptKeyring,
    deriveAccountKeys,
    encryptKeyring,
    generateAccountKeys,
    getPublicAccountKeys,
    recoverAccountKeys,
    recoveryPhraseToSeed,
    seedToRecoveryPhrase,
    validateVaultPassphrase,
} from "@/lib/crypto/keyring";
import type { EnvironmentShareContext } from "@/types/crypto";

const fastKdf = { algorithm: "argon2id13", opsLimit: 2, memLimitBytes: 32 * 1024 * 1024 } as const;
const passphrase = "correct horse battery staple";

function hex(bytes: Uint8Array) {
    return Buffer.from(bytes).toString("hex");
}

describe("account keys", () => {
    it("derives the same keys from the same seed", async () => {
        const seed = new Uint8Array(32).map((_, index) => index);
        const first = await deriveAccountKeys(seed);
        const second = await deriveAccountKeys(seed);

        assert.equal(hex(first.signPublicKey), hex(second.signPublicKey));
        assert.equal(hex(first.boxPublicKey), hex(second.boxPublicKey));
        assert.notEqual(hex(first.signPublicKey), hex(first.boxPublicKey));
    });

    it("matches the published test vector", async () => {
        const seed = new Uint8Array(32).map((_, index) => index);
        const keys = await deriveAccountKeys(seed);
        const publicKeys = await getPublicAccountKeys(keys);

        assert.deepEqual(publicKeys, {
            signPublicKey: "KrZ51wSh/Gax3vAOl3qXRM1QBN4X1UML4JuCxgwIqIM=",
            boxPublicKey: "FpG/f+3zCLW4H7ueDEeB7mCK5TrO7dkyh3fTSNvJ7wk=",
        });
        assert.equal(await computeFingerprint(publicKeys), "C9F5 8B27 0EF6 C72F DCDA 1C13 1C06 5B17 609F 44F7");
    });

    it("round-trips the recovery phrase", async () => {
        const keys = await generateAccountKeys();
        const phrase = seedToRecoveryPhrase(keys.seed);

        assert.equal(phrase.split(" ").length, 24);
        assert.equal(hex(recoveryPhraseToSeed(`  ${phrase.toUpperCase()}  `)), hex(keys.seed));
        assert.throws(() => recoveryPhraseToSeed(phrase.split(" ").reverse().join(" ")));
    });

    it("unlocks with the passphrase and rejects a wrong one", async () => {
        const keys = await generateAccountKeys();
        const keyring = await encryptKeyring({ userId: "user_1", keys, passphrase, kdfParams: fastKdf });
        const unlocked = await decryptKeyring({ userId: "user_1", keyring, passphrase });

        assert.equal(hex(unlocked.boxSecretKey), hex(keys.boxSecretKey));
        await assert.rejects(decryptKeyring({ userId: "user_1", keyring, passphrase: `${passphrase}!` }), /Wrong passphrase/);
        await assert.rejects(decryptKeyring({ userId: "user_2", keyring, passphrase }), /Wrong passphrase/);
    });

    it("rejects a keyring whose public keys were swapped", async () => {
        const keys = await generateAccountKeys();
        const other = await getPublicAccountKeys(await generateAccountKeys());
        const keyring = await encryptKeyring({ userId: "user_1", keys, passphrase, kdfParams: fastKdf });

        await assert.rejects(
            decryptKeyring({ userId: "user_1", keyring: { ...keyring, boxPublicKey: other.boxPublicKey }, passphrase }),
            /do not belong/
        );
    });

    it("rejects weak KDF parameters from the server", async () => {
        const keys = await generateAccountKeys();
        const keyring = await encryptKeyring({ userId: "user_1", keys, passphrase, kdfParams: fastKdf });

        await assert.rejects(
            decryptKeyring({ userId: "user_1", keyring: { ...keyring, kdfParams: { ...fastKdf, opsLimit: 1 } }, passphrase }),
            /Unsupported/
        );
    });

    it("recovers with the phrase only for the matching account", async () => {
        const keys = await generateAccountKeys();
        const expected = await getPublicAccountKeys(keys);
        const phrase = seedToRecoveryPhrase(keys.seed);
        const recovered = await recoverAccountKeys({ recoveryPhrase: phrase, expected });

        assert.equal(hex(recovered.signSecretKey), hex(keys.signSecretKey));
        await assert.rejects(
            recoverAccountKeys({ recoveryPhrase: phrase, expected: await getPublicAccountKeys(await generateAccountKeys()) }),
            /do not belong/
        );
    });

    it("validates passphrases", () => {
        assert.ok(validateVaultPassphrase("short"));
        assert.ok(validateVaultPassphrase("aaaaaaaaaaaaaaaa"));
        assert.equal(validateVaultPassphrase(passphrase), null);
    });
});

describe("environment keys", () => {
    async function setup() {
        const owner = await generateAccountKeys();
        const member = await generateAccountKeys();
        const ownerPublic = await getPublicAccountKeys(owner);
        const memberPublic = await getPublicAccountKeys(member);
        const environmentKey = await generateEnvironmentKey();
        const context: EnvironmentShareContext = {
            environmentKeyId: await generateEnvironmentKeyId(),
            version: 1,
            recipientUserId: "member",
            recipientBoxPublicKey: memberPublic.boxPublicKey,
        };
        const share = await sealEnvironmentKey({ key: environmentKey, context, signer: owner });

        return { owner, member, ownerPublic, memberPublic, environmentKey, context, share };
    }

    it("shares a key that only the recipient can open", async () => {
        const { member, owner, ownerPublic, environmentKey, context, share } = await setup();
        const opened = await openEnvironmentKey({
            share,
            context,
            signerSignPublicKey: ownerPublic.signPublicKey,
            recipient: member,
        });

        assert.equal(hex(opened.dataKey), hex(environmentKey.dataKey));
        await assert.rejects(
            openEnvironmentKey({ share, context, signerSignPublicKey: ownerPublic.signPublicKey, recipient: owner }),
            /different device key/
        );
    });

    it("rejects a share with a forged signer, version or recipient", async () => {
        const { member, memberPublic, ownerPublic, context, share } = await setup();
        const attacker = await getPublicAccountKeys(await generateAccountKeys());

        await assert.rejects(
            openEnvironmentKey({ share, context, signerSignPublicKey: attacker.signPublicKey, recipient: member }),
            /signature is invalid/
        );
        await assert.rejects(
            openEnvironmentKey({ share, context: { ...context, version: 2 }, signerSignPublicKey: ownerPublic.signPublicKey, recipient: member }),
            /signature is invalid/
        );
        await assert.rejects(
            openEnvironmentKey({ share, context: { ...context, recipientUserId: "other" }, signerSignPublicKey: ownerPublic.signPublicKey, recipient: member }),
            /signature is invalid/
        );
        assert.ok(memberPublic.boxPublicKey);
    });

    it("encrypts variables bound to their file, version and flags", async () => {
        const key = await generateEnvironmentKey();
        const plain = { key: "DATABASE_URL", value: "postgres://x", note: "primary", isCommented: false };
        const encrypted = await encryptVariable({ variable: plain, envFileId: "file_1", keyVersion: 1, key });

        assert.equal(encrypted.keyDigest, await computeKeyDigest("DATABASE_URL", key));
        assert.deepEqual(await decryptVariable({ variable: encrypted, envFileId: "file_1", key }), plain);
        await assert.rejects(decryptVariable({ variable: encrypted, envFileId: "file_2", key }), /Decryption failed/);
        await assert.rejects(decryptVariable({ variable: { ...encrypted, isCommented: true }, envFileId: "file_1", key }), /Decryption failed/);
        await assert.rejects(decryptVariable({ variable: { ...encrypted, keyVersion: 2 }, envFileId: "file_1", key }), /Decryption failed/);
        await assert.rejects(
            decryptVariable({ variable: { ...encrypted, encryptedValue: encrypted.encryptedKey }, envFileId: "file_1", key }),
            /Decryption failed/
        );
        await assert.rejects(decryptVariable({ variable: encrypted, envFileId: "file_1", key: await generateEnvironmentKey() }), /Decryption failed/);
    });

    it("matches the published digest vector", async () => {
        const key = await deriveEnvironmentKey(new Uint8Array(32).map((_, index) => 255 - index));

        assert.equal(await computeKeyDigest("DATABASE_URL", key), "/I+GP0zet/sPd38f0FwYBfoW7wSHcTJgaHCWxqf2Ufg=");
    });

    it("handles empty values, missing notes and unicode", async () => {
        const key = await generateEnvironmentKey();
        const plain = { key: "GREETING", value: "", note: null, isCommented: true };
        const unicode = { key: "EMOJI", value: "héllo 🌱\nline", note: "ñ", isCommented: false };

        for (const variable of [plain, unicode]) {
            const encrypted = await encryptVariable({ variable, envFileId: "f", keyVersion: 3, key });
            assert.deepEqual(await decryptVariable({ variable: encrypted, envFileId: "f", key }), variable);
        }
    });
});

describe("cli keys", () => {
    it("splits and recombines the account key", async () => {
        const keys = await generateAccountKeys();
        const expected = await getPublicAccountKeys(keys);
        const tokenHash = "a".repeat(64);
        const shares = await splitAccountKeyForCli({ keys, tokenHash });
        const transport = await generateCliTransportKeyPair();
        const sealed = await sealCliPackage({ ...shares, transportPublicKey: transport.publicKey });
        const opened = await openCliPackage({
            sealedPackage: sealed,
            transportPublicKey: transport.publicKey,
            transportSecretKey: transport.secretKey,
        });
        const combined = await combineCliAccountKey({
            ...opened,
            encryptedServerShare: shares.encryptedServerShare,
            tokenHash,
            expected,
        });

        assert.equal(hex(combined.boxSecretKey), hex(keys.boxSecretKey));
        assert.equal(hex(combined.signSecretKey), hex(keys.signSecretKey));
        await assert.rejects(
            combineCliAccountKey({ ...opened, encryptedServerShare: shares.encryptedServerShare, tokenHash: "b".repeat(64), expected }),
            /Decryption failed/
        );
        await assert.rejects(
            combineCliAccountKey({
                ...opened,
                encryptedServerShare: shares.encryptedServerShare,
                tokenHash,
                expected: await getPublicAccountKeys(await generateAccountKeys()),
            }),
            /does not match/
        );
    });

    it("formats a stable verification code", async () => {
        const transport = await generateCliTransportKeyPair();
        const code = await computeVerificationCode(transport.publicKey);

        assert.match(code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
        assert.equal(code, await computeVerificationCode(transport.publicKey));
    });
});
