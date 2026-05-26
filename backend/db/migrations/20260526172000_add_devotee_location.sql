ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "village" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tehsil" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "state" TEXT;

CREATE INDEX IF NOT EXISTS "User_village_idx" ON "User"("village");
CREATE INDEX IF NOT EXISTS "User_city_idx" ON "User"("city");
CREATE INDEX IF NOT EXISTS "User_tehsil_idx" ON "User"("tehsil");
CREATE INDEX IF NOT EXISTS "User_district_idx" ON "User"("district");
CREATE INDEX IF NOT EXISTS "User_state_idx" ON "User"("state");
