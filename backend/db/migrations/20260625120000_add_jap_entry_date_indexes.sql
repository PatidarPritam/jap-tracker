-- Speed up the most common JapEntry access patterns:
--  * per-devotee history ordered by date (devotee dashboard / jap-entries API)
--  * date-range reporting and ordering
CREATE INDEX IF NOT EXISTS "JapEntry_devoteeId_entryDate_idx"
  ON "JapEntry" ("devoteeId", "entryDate" DESC);

CREATE INDEX IF NOT EXISTS "JapEntry_entryDate_idx"
  ON "JapEntry" ("entryDate");
