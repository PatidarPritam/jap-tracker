-- Web Push subscriptions for the daily jap reminder. One devotee may have
-- several (phone, tablet), so the endpoint is the natural key.
CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT PRIMARY KEY,
  "devoteeId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "PushSubscription_devoteeId_idx"
  ON "PushSubscription"("devoteeId");
