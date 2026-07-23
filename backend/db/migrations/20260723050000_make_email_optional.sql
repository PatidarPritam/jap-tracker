-- Devotees register with mobile + PIN; many at the ashram have no email.
-- The unique index still applies to rows that do have one (NULLs never clash).
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
