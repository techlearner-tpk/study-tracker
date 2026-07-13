-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE', 'TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiLearningMode" AS ENUM ('TEACH', 'TEST');

-- CreateEnum
CREATE TYPE "AiSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AiLearningMessageRole" AS ENUM ('SYSTEM', 'CHILD', 'ASSISTANT');

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'FREE',
    "planCode" TEXT,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "topicPromptLimit" INTEGER,
    "testQuestionCount" INTEGER,
    "maxUserPromptLength" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRequestLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "sessionId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTopicUsage" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "promptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTopicUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLearningSession" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "mode" "AiLearningMode" NOT NULL,
    "status" "AiSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiLearningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLearningMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AiLearningMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiLearningMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTestAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "questionCount" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "scorePercentage" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "questionsJson" JSONB NOT NULL,
    "answersJson" JSONB,
    "evaluationJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_parentId_key" ON "Subscription"("parentId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_expiresAt_idx" ON "Subscription"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiRequestLog_requestId_key" ON "AiRequestLog"("requestId");

-- CreateIndex
CREATE INDEX "AiRequestLog_operation_idx" ON "AiRequestLog"("operation");

-- CreateIndex
CREATE INDEX "AiRequestLog_sessionId_idx" ON "AiRequestLog"("sessionId");

-- CreateIndex
CREATE INDEX "AiTopicUsage_childId_idx" ON "AiTopicUsage"("childId");

-- CreateIndex
CREATE INDEX "AiTopicUsage_topicId_idx" ON "AiTopicUsage"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "AiTopicUsage_childId_topicId_key" ON "AiTopicUsage"("childId", "topicId");

-- CreateIndex
CREATE INDEX "AiLearningSession_childId_idx" ON "AiLearningSession"("childId");

-- CreateIndex
CREATE INDEX "AiLearningSession_topicId_idx" ON "AiLearningSession"("topicId");

-- CreateIndex
CREATE INDEX "AiLearningSession_assignmentId_idx" ON "AiLearningSession"("assignmentId");

-- CreateIndex
CREATE INDEX "AiLearningSession_status_idx" ON "AiLearningSession"("status");

-- CreateIndex
CREATE INDEX "AiLearningSession_mode_idx" ON "AiLearningSession"("mode");

-- CreateIndex
CREATE INDEX "AiLearningMessage_sessionId_idx" ON "AiLearningMessage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiLearningMessage_sessionId_sequence_key" ON "AiLearningMessage"("sessionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AiTestAttempt_sessionId_key" ON "AiTestAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "AiTestAttempt_childId_idx" ON "AiTestAttempt"("childId");

-- CreateIndex
CREATE INDEX "AiTestAttempt_topicId_idx" ON "AiTestAttempt"("topicId");

-- CreateIndex
CREATE INDEX "AiTestAttempt_assignmentId_idx" ON "AiTestAttempt"("assignmentId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTopicUsage" ADD CONSTRAINT "AiTopicUsage_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTopicUsage" ADD CONSTRAINT "AiTopicUsage_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLearningSession" ADD CONSTRAINT "AiLearningSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLearningSession" ADD CONSTRAINT "AiLearningSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLearningSession" ADD CONSTRAINT "AiLearningSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLearningMessage" ADD CONSTRAINT "AiLearningMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiLearningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTestAttempt" ADD CONSTRAINT "AiTestAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiLearningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTestAttempt" ADD CONSTRAINT "AiTestAttempt_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTestAttempt" ADD CONSTRAINT "AiTestAttempt_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTestAttempt" ADD CONSTRAINT "AiTestAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
