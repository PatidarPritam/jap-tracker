ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mobile" TEXT;

CREATE INDEX IF NOT EXISTS "User_mobile_idx" ON "User"("mobile");
