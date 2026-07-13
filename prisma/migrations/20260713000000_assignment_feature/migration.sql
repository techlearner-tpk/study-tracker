-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('PARENT', 'SELF');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('STUDY', 'PRACTICE', 'REVISION', 'TEST');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AssignmentPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "source" "AssignmentSource" NOT NULL,
    "type" "AssignmentType" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" "AssignmentPriority" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plannedDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "instructions" TEXT,
    "studySessionTarget" INTEGER,
    "practiceSessionTarget" INTEGER,
    "questionTarget" INTEGER,
    "maximumMarks" INTEGER,
    "passingMarks" INTEGER,
    "durationMinutes" INTEGER,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN     "assignmentId" TEXT;
ALTER TABLE "PracticeSession" ADD COLUMN     "assignmentId" TEXT;
ALTER TABLE "RevisionSession" ADD COLUMN     "assignmentId" TEXT;

-- CreateIndex
CREATE INDEX "Assignment_childId_idx" ON "Assignment"("childId");

-- CreateIndex
CREATE INDEX "Assignment_topicId_idx" ON "Assignment"("topicId");

-- CreateIndex
CREATE INDEX "Assignment_assignedByUserId_idx" ON "Assignment"("assignedByUserId");

-- CreateIndex
CREATE INDEX "Assignment_status_idx" ON "Assignment"("status");

-- CreateIndex
CREATE INDEX "Assignment_dueDate_idx" ON "Assignment"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_active_unique" ON "Assignment"("childId", "topicId", "type") WHERE "isActive";

-- CreateIndex
CREATE INDEX "StudySession_assignmentId_idx" ON "StudySession"("assignmentId");

-- CreateIndex
CREATE INDEX "PracticeSession_assignmentId_idx" ON "PracticeSession"("assignmentId");

-- CreateIndex
CREATE INDEX "RevisionSession_assignmentId_idx" ON "RevisionSession"("assignmentId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionSession" ADD CONSTRAINT "RevisionSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
