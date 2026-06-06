-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('BEHAVIORAL', 'TECHNICAL', 'SYSTEM_DESIGN', 'HIRING_MANAGER', 'RECRUITER', 'PANEL', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewFormat" AS ENUM ('PHONE', 'VIDEO', 'ONSITE', 'TAKE_HOME', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewOutcome" AS ENUM ('SCHEDULED', 'COMPLETED', 'PASSED', 'FAILED', 'CANCELLED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "InterviewNoteType" AS ENUM ('PREP', 'RAW_POST_INTERVIEW', 'STRUCTURED_ANALYSIS', 'FEEDBACK', 'FOLLOW_UP_DRAFT');

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "type" "InterviewType" NOT NULL,
    "format" "InterviewFormat" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "interviewers" TEXT,
    "expectedTopics" TEXT,
    "prepNotes" TEXT,
    "rawPostInterviewNotes" TEXT,
    "outcome" "InterviewOutcome" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "type" "InterviewNoteType" NOT NULL,
    "body" TEXT NOT NULL,
    "analysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interview_userId_scheduledAt_idx" ON "Interview"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Interview_applicationId_idx" ON "Interview"("applicationId");

-- CreateIndex
CREATE INDEX "InterviewNote_userId_idx" ON "InterviewNote"("userId");

-- CreateIndex
CREATE INDEX "InterviewNote_interviewId_idx" ON "InterviewNote"("interviewId");

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewNote" ADD CONSTRAINT "InterviewNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewNote" ADD CONSTRAINT "InterviewNote_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
