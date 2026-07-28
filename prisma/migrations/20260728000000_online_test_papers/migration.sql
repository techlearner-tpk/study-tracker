-- CreateEnum
CREATE TYPE "TestTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OnlineTestQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', 'VERY_SHORT_ANSWER', 'SHORT_ANSWER', 'LONG_ANSWER', 'NUMERICAL', 'CASE_BASED', 'ASSERTION_REASON', 'READING_COMPREHENSION', 'GRAMMAR', 'WRITING', 'VOCABULARY');

-- CreateEnum
CREATE TYPE "OnlineTestDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'MIXED');

-- CreateEnum
CREATE TYPE "OnlineTestPaperSource" AS ENUM ('ASSIGNED_BY_PARENT', 'SELF_PRACTICE');

-- CreateEnum
CREATE TYPE "OnlineTestPaperStatus" AS ENUM ('GENERATING', 'REVIEWING', 'DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'EVALUATED', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "OnlineTestAiReviewStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "OnlineTestAttemptStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'EVALUATED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "AiQuotaReservationStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED', 'FAILED');

-- AlterTable
ALTER TABLE "AiSetting" ADD COLUMN "testPaperMaxQuestions" INTEGER,
ADD COLUMN "testPaperRetryCount" INTEGER,
ADD COLUMN "evaluationReviewThreshold" DOUBLE PRECISION,
ADD COLUMN "testAutosaveIntervalMs" INTEGER;

-- CreateTable
CREATE TABLE "AiTopicUsageReservation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "usageId" TEXT,
    "testPaperId" TEXT,
    "status" "AiQuotaReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTopicUsageReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boardId" TEXT,
    "classId" TEXT,
    "subjectId" TEXT,
    "subjectName" TEXT NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "difficulty" "OnlineTestDifficulty" NOT NULL DEFAULT 'MIXED',
    "status" "TestTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestTemplateSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestTemplateSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestTemplateRule" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "questionType" "OnlineTestQuestionType" NOT NULL,
    "marksPerQuestion" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "difficulty" "OnlineTestDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "internalChoiceCount" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestTemplateRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineTestPaper" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "source" "OnlineTestPaperSource" NOT NULL,
    "title" TEXT NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "difficulty" "OnlineTestDifficulty" NOT NULL DEFAULT 'MIXED',
    "status" "OnlineTestPaperStatus" NOT NULL DEFAULT 'DRAFT',
    "aiReviewStatus" "OnlineTestAiReviewStatus" NOT NULL DEFAULT 'PENDING',
    "generationRequestId" TEXT,
    "aiReviewJson" JSONB,
    "dueAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineTestPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineTestPaperTopic" (
    "id" TEXT NOT NULL,
    "testPaperId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "allocatedMarks" INTEGER NOT NULL,
    "allocatedQuestionCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnlineTestPaperTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineTestSection" (
    "id" TEXT NOT NULL,
    "testPaperId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineTestSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineTestQuestion" (
    "id" TEXT NOT NULL,
    "testPaperId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "questionType" "OnlineTestQuestionType" NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionsJson" JSONB,
    "correctAnswerJson" JSONB NOT NULL,
    "markingSchemeJson" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "marks" INTEGER NOT NULL,
    "difficulty" "OnlineTestDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "order" INTEGER NOT NULL DEFAULT 0,
    "aiReviewStatus" "OnlineTestAiReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineTestAttempt" (
    "id" TEXT NOT NULL,
    "testPaperId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "status" "OnlineTestAttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "evaluatedAt" TIMESTAMP(3),
    "aiAwardedMarks" DOUBLE PRECISION,
    "finalMarks" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "overallFeedback" TEXT,
    "strengthsJson" JSONB,
    "weakAreasJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineTestAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "answerJson" JSONB,
    "aiAwardedMarks" DOUBLE PRECISION,
    "finalMarks" DOUBLE PRECISION,
    "aiFeedback" TEXT,
    "parentFeedback" TEXT,
    "evaluationConfidence" DOUBLE PRECISION,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineTestAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiTopicUsageReservation_requestId_topicId_key" ON "AiTopicUsageReservation"("requestId", "topicId");

-- CreateIndex
CREATE INDEX "AiTopicUsageReservation_childId_topicId_status_idx" ON "AiTopicUsageReservation"("childId", "topicId", "status");

-- CreateIndex
CREATE INDEX "AiTopicUsageReservation_testPaperId_idx" ON "AiTopicUsageReservation"("testPaperId");

-- CreateIndex
CREATE INDEX "TestTemplate_status_idx" ON "TestTemplate"("status");

-- CreateIndex
CREATE INDEX "TestTemplate_subjectName_idx" ON "TestTemplate"("subjectName");

-- CreateIndex
CREATE INDEX "TestTemplate_createdByUserId_idx" ON "TestTemplate"("createdByUserId");

-- CreateIndex
CREATE INDEX "TestTemplateSection_templateId_idx" ON "TestTemplateSection"("templateId");

-- CreateIndex
CREATE INDEX "TestTemplateRule_sectionId_idx" ON "TestTemplateRule"("sectionId");

-- CreateIndex
CREATE INDEX "OnlineTestPaper_childId_idx" ON "OnlineTestPaper"("childId");

-- CreateIndex
CREATE INDEX "OnlineTestPaper_subjectId_idx" ON "OnlineTestPaper"("subjectId");

-- CreateIndex
CREATE INDEX "OnlineTestPaper_templateId_idx" ON "OnlineTestPaper"("templateId");

-- CreateIndex
CREATE INDEX "OnlineTestPaper_createdByUserId_idx" ON "OnlineTestPaper"("createdByUserId");

-- CreateIndex
CREATE INDEX "OnlineTestPaper_status_idx" ON "OnlineTestPaper"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineTestPaperTopic_testPaperId_topicId_key" ON "OnlineTestPaperTopic"("testPaperId", "topicId");

-- CreateIndex
CREATE INDEX "OnlineTestPaperTopic_topicId_idx" ON "OnlineTestPaperTopic"("topicId");

-- CreateIndex
CREATE INDEX "OnlineTestPaperTopic_chapterId_idx" ON "OnlineTestPaperTopic"("chapterId");

-- CreateIndex
CREATE INDEX "OnlineTestSection_testPaperId_idx" ON "OnlineTestSection"("testPaperId");

-- CreateIndex
CREATE INDEX "OnlineTestQuestion_testPaperId_idx" ON "OnlineTestQuestion"("testPaperId");

-- CreateIndex
CREATE INDEX "OnlineTestQuestion_sectionId_idx" ON "OnlineTestQuestion"("sectionId");

-- CreateIndex
CREATE INDEX "OnlineTestQuestion_topicId_idx" ON "OnlineTestQuestion"("topicId");

-- CreateIndex
CREATE INDEX "OnlineTestAttempt_testPaperId_idx" ON "OnlineTestAttempt"("testPaperId");

-- CreateIndex
CREATE INDEX "OnlineTestAttempt_childId_idx" ON "OnlineTestAttempt"("childId");

-- CreateIndex
CREATE INDEX "OnlineTestAttempt_status_idx" ON "OnlineTestAttempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineTestAnswer_attemptId_questionId_key" ON "OnlineTestAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "OnlineTestAnswer_questionId_idx" ON "OnlineTestAnswer"("questionId");

-- AddForeignKey
ALTER TABLE "AiTopicUsageReservation" ADD CONSTRAINT "AiTopicUsageReservation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTopicUsageReservation" ADD CONSTRAINT "AiTopicUsageReservation_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTopicUsageReservation" ADD CONSTRAINT "AiTopicUsageReservation_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "AiTopicUsage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTopicUsageReservation" ADD CONSTRAINT "AiTopicUsageReservation_testPaperId_fkey" FOREIGN KEY ("testPaperId") REFERENCES "OnlineTestPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestTemplate" ADD CONSTRAINT "TestTemplate_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CurriculumBoard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestTemplate" ADD CONSTRAINT "TestTemplate_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CurriculumClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestTemplate" ADD CONSTRAINT "TestTemplate_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestTemplate" ADD CONSTRAINT "TestTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestTemplateSection" ADD CONSTRAINT "TestTemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TestTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestTemplateRule" ADD CONSTRAINT "TestTemplateRule_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TestTemplateSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestPaper" ADD CONSTRAINT "OnlineTestPaper_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestPaper" ADD CONSTRAINT "OnlineTestPaper_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestPaper" ADD CONSTRAINT "OnlineTestPaper_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TestTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestPaper" ADD CONSTRAINT "OnlineTestPaper_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestPaperTopic" ADD CONSTRAINT "OnlineTestPaperTopic_testPaperId_fkey" FOREIGN KEY ("testPaperId") REFERENCES "OnlineTestPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestPaperTopic" ADD CONSTRAINT "OnlineTestPaperTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestPaperTopic" ADD CONSTRAINT "OnlineTestPaperTopic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestSection" ADD CONSTRAINT "OnlineTestSection_testPaperId_fkey" FOREIGN KEY ("testPaperId") REFERENCES "OnlineTestPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestQuestion" ADD CONSTRAINT "OnlineTestQuestion_testPaperId_fkey" FOREIGN KEY ("testPaperId") REFERENCES "OnlineTestPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestQuestion" ADD CONSTRAINT "OnlineTestQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "OnlineTestSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestQuestion" ADD CONSTRAINT "OnlineTestQuestion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestQuestion" ADD CONSTRAINT "OnlineTestQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestAttempt" ADD CONSTRAINT "OnlineTestAttempt_testPaperId_fkey" FOREIGN KEY ("testPaperId") REFERENCES "OnlineTestPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestAttempt" ADD CONSTRAINT "OnlineTestAttempt_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestAnswer" ADD CONSTRAINT "OnlineTestAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "OnlineTestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineTestAnswer" ADD CONSTRAINT "OnlineTestAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "OnlineTestQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
