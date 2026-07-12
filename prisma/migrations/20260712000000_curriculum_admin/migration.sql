-- CreateEnum
CREATE TYPE "CurriculumStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CurriculumVerificationStatus" AS ENUM ('OFFICIAL', 'VERIFIED_FROM_OFFICIAL_SOURCE', 'CURATED_FROM_OFFICIAL_SOURCE', 'REVIEW_REQUIRED');

-- CreateTable
CREATE TABLE "CurriculumBoard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumVersion" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CurriculumStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "CurriculumVerificationStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "sourceUrl" TEXT,
    "notes" TEXT,
    "sourceReferences" JSONB,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumClass" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumSubject" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "isDefaultSelected" BOOLEAN NOT NULL DEFAULT false,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isLanguageSubject" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "verificationStatus" "CurriculumVerificationStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumChapter" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "verificationStatus" "CurriculumVerificationStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumTopic" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "verificationStatus" "CurriculumVerificationStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumAssignment" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "curriculumVersionId" TEXT NOT NULL,
    "curriculumClassId" TEXT NOT NULL,
    "selectedSubjectIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumAssignment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subject" ADD COLUMN     "curriculumAssignmentId" TEXT;
ALTER TABLE "Subject" ADD COLUMN     "curriculumVersionId" TEXT;
ALTER TABLE "Subject" ADD COLUMN     "curriculumSubjectId" TEXT;

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "curriculumAssignmentId" TEXT;
ALTER TABLE "Chapter" ADD COLUMN     "curriculumVersionId" TEXT;
ALTER TABLE "Chapter" ADD COLUMN     "curriculumSubjectId" TEXT;
ALTER TABLE "Chapter" ADD COLUMN     "curriculumChapterId" TEXT;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Topic" ADD COLUMN     "curriculumAssignmentId" TEXT;
ALTER TABLE "Topic" ADD COLUMN     "curriculumVersionId" TEXT;
ALTER TABLE "Topic" ADD COLUMN     "curriculumSubjectId" TEXT;
ALTER TABLE "Topic" ADD COLUMN     "curriculumChapterId" TEXT;
ALTER TABLE "Topic" ADD COLUMN     "curriculumTopicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumBoard_code_key" ON "CurriculumBoard"("code");

-- CreateIndex
CREATE INDEX "CurriculumVersion_boardId_idx" ON "CurriculumVersion"("boardId");

-- CreateIndex
CREATE INDEX "CurriculumVersion_status_idx" ON "CurriculumVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumVersion_boardId_academicYear_version_key" ON "CurriculumVersion"("boardId", "academicYear", "version");

-- CreateIndex
CREATE INDEX "CurriculumClass_versionId_idx" ON "CurriculumClass"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumClass_versionId_level_key" ON "CurriculumClass"("versionId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumClass_versionId_stableKey_key" ON "CurriculumClass"("versionId", "stableKey");

-- CreateIndex
CREATE INDEX "CurriculumSubject_classId_idx" ON "CurriculumSubject"("classId");

-- CreateIndex
CREATE INDEX "CurriculumSubject_archivedAt_idx" ON "CurriculumSubject"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumSubject_classId_stableKey_key" ON "CurriculumSubject"("classId", "stableKey");

-- CreateIndex
CREATE INDEX "CurriculumChapter_subjectId_idx" ON "CurriculumChapter"("subjectId");

-- CreateIndex
CREATE INDEX "CurriculumChapter_archivedAt_idx" ON "CurriculumChapter"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumChapter_subjectId_stableKey_key" ON "CurriculumChapter"("subjectId", "stableKey");

-- CreateIndex
CREATE INDEX "CurriculumTopic_chapterId_idx" ON "CurriculumTopic"("chapterId");

-- CreateIndex
CREATE INDEX "CurriculumTopic_archivedAt_idx" ON "CurriculumTopic"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumTopic_chapterId_stableKey_key" ON "CurriculumTopic"("chapterId", "stableKey");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumAssignment_childId_key" ON "CurriculumAssignment"("childId");

-- CreateIndex
CREATE INDEX "Subject_curriculumVersionId_idx" ON "Subject"("curriculumVersionId");

-- CreateIndex
CREATE INDEX "Subject_curriculumAssignmentId_idx" ON "Subject"("curriculumAssignmentId");

-- CreateIndex
CREATE INDEX "Chapter_curriculumVersionId_idx" ON "Chapter"("curriculumVersionId");

-- CreateIndex
CREATE INDEX "Chapter_curriculumAssignmentId_idx" ON "Chapter"("curriculumAssignmentId");

-- CreateIndex
CREATE INDEX "Topic_curriculumVersionId_idx" ON "Topic"("curriculumVersionId");

-- CreateIndex
CREATE INDEX "Topic_curriculumAssignmentId_idx" ON "Topic"("curriculumAssignmentId");

-- AddForeignKey
ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CurriculumBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumClass" ADD CONSTRAINT "CurriculumClass_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumSubject" ADD CONSTRAINT "CurriculumSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CurriculumClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumChapter" ADD CONSTRAINT "CurriculumChapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CurriculumSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumTopic" ADD CONSTRAINT "CurriculumTopic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CurriculumChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumAssignment" ADD CONSTRAINT "CurriculumAssignment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumAssignment" ADD CONSTRAINT "CurriculumAssignment_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumAssignment" ADD CONSTRAINT "CurriculumAssignment_curriculumClassId_fkey" FOREIGN KEY ("curriculumClassId") REFERENCES "CurriculumClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_curriculumAssignmentId_fkey" FOREIGN KEY ("curriculumAssignmentId") REFERENCES "CurriculumAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_curriculumAssignmentId_fkey" FOREIGN KEY ("curriculumAssignmentId") REFERENCES "CurriculumAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_curriculumAssignmentId_fkey" FOREIGN KEY ("curriculumAssignmentId") REFERENCES "CurriculumAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
