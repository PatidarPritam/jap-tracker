ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accessCode" TEXT;

UPDATE "User"
SET "accessCode" = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE role = 'DEVOTEE' AND "accessCode" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_accessCode_key" ON "User"("accessCode");

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "devoteeId" ORDER BY "createdAt" DESC) AS row_number
  FROM "Sankalp"
  WHERE status = 'ACTIVE'
)
UPDATE "Sankalp"
SET status = 'SUPERSEDED', "updatedAt" = NOW()
WHERE id IN (
  SELECT id FROM ranked WHERE row_number > 1
);
