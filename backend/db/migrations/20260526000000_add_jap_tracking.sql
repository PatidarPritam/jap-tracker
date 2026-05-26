-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DEVOTEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Sankalp" (
    "id" TEXT NOT NULL,
    "devoteeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sankalp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "JapEntry" (
    "id" TEXT NOT NULL,
    "devoteeId" TEXT NOT NULL,
    "sankalpId" TEXT,
    "count" INTEGER NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JapEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sankalp_devoteeId_idx" ON "Sankalp"("devoteeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "JapEntry_devoteeId_idx" ON "JapEntry"("devoteeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "JapEntry_sankalpId_idx" ON "JapEntry"("sankalpId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Sankalp_devoteeId_fkey'
  ) THEN
    ALTER TABLE "Sankalp" ADD CONSTRAINT "Sankalp_devoteeId_fkey" FOREIGN KEY ("devoteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JapEntry_devoteeId_fkey'
  ) THEN
    ALTER TABLE "JapEntry" ADD CONSTRAINT "JapEntry_devoteeId_fkey" FOREIGN KEY ("devoteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JapEntry_sankalpId_fkey'
  ) THEN
    ALTER TABLE "JapEntry" ADD CONSTRAINT "JapEntry_sankalpId_fkey" FOREIGN KEY ("sankalpId") REFERENCES "Sankalp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
