-- Notice board for the ashram: admins post updates, devotees read them on
-- their dashboard. `publishedAt` lets a notice be scheduled ahead of time and
-- `expiresAt` retires it automatically, so stale notices don't need cleanup.
CREATE TABLE IF NOT EXISTS "Announcement" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- The devotee-facing query is "live notices, pinned first, newest first".
CREATE INDEX IF NOT EXISTS "Announcement_publishedAt_idx"
  ON "Announcement" ("isPinned" DESC, "publishedAt" DESC);

CREATE INDEX IF NOT EXISTS "Announcement_expiresAt_idx"
  ON "Announcement" ("expiresAt");
