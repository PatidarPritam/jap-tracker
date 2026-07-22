-- Daily darshan image shown on every devotee's dashboard. The image is stored
-- as a (client-downscaled) data URL right in the row — the deployment has no
-- object storage configured, and a single small daily image is well within
-- what a TEXT column comfortably holds.
CREATE TABLE IF NOT EXISTS "Darshan" (
  "id" TEXT PRIMARY KEY,
  "imageData" TEXT NOT NULL,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- The devotee view only ever wants the newest one.
CREATE INDEX IF NOT EXISTS "Darshan_createdAt_idx" ON "Darshan" ("createdAt" DESC);
