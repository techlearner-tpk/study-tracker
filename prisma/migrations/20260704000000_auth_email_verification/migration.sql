-- Rename enum to introduce kid role without relying on ALTER TYPE ... ADD VALUE in a transaction.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('PARENT', 'KID');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
  USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'PARENT';
DROP TYPE "UserRole_old";

-- Email-link verification and kid linkage.
CREATE TYPE "MagicLinkType" AS ENUM ('SIGNUP', 'SIGNIN', 'INVITE');

ALTER TABLE "User" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "childId" TEXT;
CREATE UNIQUE INDEX "User_childId_key" ON "User"("childId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "MagicLinkType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "childId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");
CREATE INDEX "MagicLinkToken_email_idx" ON "MagicLinkToken"("email");
CREATE INDEX "MagicLinkToken_childId_idx" ON "MagicLinkToken"("childId");
CREATE INDEX "MagicLinkToken_expiresAt_idx" ON "MagicLinkToken"("expiresAt");

ALTER TABLE "MagicLinkToken"
  ADD CONSTRAINT "MagicLinkToken_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
