-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('RECRUITER_EMAIL', 'LINKEDIN_MESSAGE', 'JOB_DESCRIPTION', 'INTERVIEW_NOTES', 'FOLLOW_UP', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ImportSessionStatus" AS ENUM ('DRAFT', 'ANALYZED', 'COMMITTED', 'FAILED');

-- CreateTable
CREATE TABLE "ImportSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" "ImportSourceType" NOT NULL,
    "rawText" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "ImportSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "analysisJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "ImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportSession_userId_createdAt_idx" ON "ImportSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportSession_userId_status_idx" ON "ImportSession"("userId", "status");

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
