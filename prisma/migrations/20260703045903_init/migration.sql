-- CreateEnum
CREATE TYPE "LearningStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "HabitGoalMetric" AS ENUM ('STUDY_MINUTES_DAILY', 'STUDY_DAYS_WEEKLY', 'STUDY_SESSION_DAILY');

-- CreateEnum
CREATE TYPE "OutcomeGoalType" AS ENUM ('COMPLETE_TOPIC', 'COMPLETE_CHAPTER');

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "school" TEXT,
    "themeColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "LearningStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "confidenceRating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "questionsAttempted" INTEGER,
    "questionsCorrect" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionSession" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevisionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitGoal" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metric" "HabitGoalMetric" NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeGoal" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "OutcomeGoalType" NOT NULL,
    "targetTopicId" TEXT,
    "targetChapterId" TEXT,
    "dueDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutcomeGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Child_name_idx" ON "Child"("name");

-- CreateIndex
CREATE INDEX "Subject_childId_idx" ON "Subject"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_childId_name_key" ON "Subject"("childId", "name");

-- CreateIndex
CREATE INDEX "Chapter_subjectId_idx" ON "Chapter"("subjectId");

-- CreateIndex
CREATE INDEX "Topic_chapterId_idx" ON "Topic"("chapterId");

-- CreateIndex
CREATE INDEX "Topic_status_idx" ON "Topic"("status");

-- CreateIndex
CREATE INDEX "StudySession_topicId_idx" ON "StudySession"("topicId");

-- CreateIndex
CREATE INDEX "StudySession_startTime_idx" ON "StudySession"("startTime");

-- CreateIndex
CREATE INDEX "PracticeSession_topicId_idx" ON "PracticeSession"("topicId");

-- CreateIndex
CREATE INDEX "PracticeSession_date_idx" ON "PracticeSession"("date");

-- CreateIndex
CREATE INDEX "RevisionSession_topicId_idx" ON "RevisionSession"("topicId");

-- CreateIndex
CREATE INDEX "RevisionSession_date_idx" ON "RevisionSession"("date");

-- CreateIndex
CREATE INDEX "HabitGoal_childId_idx" ON "HabitGoal"("childId");

-- CreateIndex
CREATE INDEX "OutcomeGoal_childId_idx" ON "OutcomeGoal"("childId");

-- CreateIndex
CREATE INDEX "OutcomeGoal_targetTopicId_idx" ON "OutcomeGoal"("targetTopicId");

-- CreateIndex
CREATE INDEX "OutcomeGoal_targetChapterId_idx" ON "OutcomeGoal"("targetChapterId");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionSession" ADD CONSTRAINT "RevisionSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitGoal" ADD CONSTRAINT "HabitGoal_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeGoal" ADD CONSTRAINT "OutcomeGoal_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
