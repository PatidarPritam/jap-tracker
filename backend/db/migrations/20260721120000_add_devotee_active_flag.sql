-- Soft-delete for devotees. A hard DELETE would cascade away their JapEntry
-- rows, destroying the ashram's record of jap already offered; deactivating
-- keeps the history and only removes them from the working lists and login.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User" ("isActive");
