-- Migrate from NextAuth (+ custom sessions) to Better Auth.
-- Run before `prisma db push`. Users, workspaces and all app data are kept.
BEGIN;

-- user.emailVerified: timestamp -> boolean (verified = had a timestamp)
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'emailVerified') <> 'boolean' THEN
        ALTER TABLE "User" ALTER COLUMN "emailVerified" TYPE boolean USING ("emailVerified" IS NOT NULL);
    END IF;
END $$;
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET DEFAULT false;
UPDATE "User" SET "emailVerified" = false WHERE "emailVerified" IS NULL;
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET NOT NULL;

-- NextAuth OAuth links are re-created by Better Auth's account linking on next sign-in.
DROP TABLE IF EXISTS "Account";
-- NextAuth used JWT sessions, so these hold nothing worth keeping.
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";
-- Custom session tracking and 2FA drafts replaced by Better Auth.
DROP TABLE IF EXISTS "AppSession";
DROP TABLE IF EXISTS "TwoFactorAuth";
DROP TABLE IF EXISTS "RecoveryCode";

COMMIT;
