ALTER TABLE "users"
  ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bannedUntil" TIMESTAMP(3),
  ADD COLUMN "banReason" TEXT,
  ADD COLUMN "isRestricted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "restrictedUntil" TIMESTAMP(3),
  ADD COLUMN "restrictionReason" TEXT;
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_isBanned_idx" ON "users"("isBanned");
CREATE INDEX "users_isRestricted_idx" ON "users"("isRestricted");
