import { z } from "zod";

export const curriculumStatusValues = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const curriculumVerificationStatusValues = [
  "OFFICIAL",
  "VERIFIED_FROM_OFFICIAL_SOURCE",
  "CURATED_FROM_OFFICIAL_SOURCE",
  "REVIEW_REQUIRED",
] as const;

const curriculumVerificationStatusSchema = z.enum(curriculumVerificationStatusValues);

export const curriculumTopicSeedSchema = z.object({
  stableKey: z.string().trim().min(1, "Topic stable key is required"),
  name: z.string().trim().min(1, "Topic name is required"),
  sequence: z.coerce.number().int().min(1),
  sourceUrl: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  verificationStatus: curriculumVerificationStatusSchema.optional(),
});

export const curriculumChapterSeedSchema = z.object({
  stableKey: z.string().trim().min(1, "Chapter stable key is required"),
  name: z.string().trim().min(1, "Chapter name is required"),
  sequence: z.coerce.number().int().min(1),
  sourceUrl: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  verificationStatus: curriculumVerificationStatusSchema.optional(),
  topics: z.array(curriculumTopicSeedSchema).min(1, "A chapter must include at least one topic"),
});

export const curriculumSubjectSeedSchema = z.object({
  stableKey: z.string().trim().min(1, "Subject stable key is required"),
  name: z.string().trim().min(1, "Subject name is required"),
  sequence: z.coerce.number().int().min(1),
  isDefaultSelected: z.coerce.boolean().default(false),
  isOptional: z.coerce.boolean().default(false),
  isLanguageSubject: z.coerce.boolean().default(false),
  sourceUrl: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  verificationStatus: curriculumVerificationStatusSchema.optional(),
  chapters: z.array(curriculumChapterSeedSchema).min(1, "A subject must include at least one chapter"),
});

export const curriculumClassSeedSchema = z.object({
  level: z.coerce.number().int().positive("Class level is required"),
  name: z.string().trim().min(1, "Class name is required"),
  sequence: z.coerce.number().int().min(1),
  stableKey: z.string().trim().min(1, "Class stable key is required").optional(),
  subjects: z.array(curriculumSubjectSeedSchema).min(1, "A class must include at least one subject"),
});

export const curriculumVersionSeedSchema = z.object({
  academicYear: z.string().trim().min(1, "Academic year is required"),
  version: z.string().trim().min(1, "Version is required"),
  name: z.string().trim().min(1, "Version name is required"),
  status: z.enum(curriculumStatusValues).default("DRAFT"),
  verificationStatus: curriculumVerificationStatusSchema.default("REVIEW_REQUIRED"),
  notes: z.array(z.string().trim().min(1)).default([]),
  sources: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        url: z.string().trim().url(),
      }),
    )
    .default([]),
});

export const curriculumBoardSeedSchema = z.object({
  name: z.string().trim().min(1, "Board name is required"),
  code: z.string().trim().min(1, "Board code is required"),
});

export const curriculumSeedSchema = z.object({
  schemaVersion: z.literal("1.0"),
  seedId: z.string().trim().min(1),
  board: curriculumBoardSeedSchema,
  curriculumVersion: curriculumVersionSeedSchema,
  classes: z.array(curriculumClassSeedSchema).min(1, "At least one class is required"),
});

export type CurriculumSeed = z.infer<typeof curriculumSeedSchema>;
export type CurriculumClassSeed = z.infer<typeof curriculumClassSeedSchema>;
export type CurriculumSubjectSeed = z.infer<typeof curriculumSubjectSeedSchema>;
export type CurriculumChapterSeed = z.infer<typeof curriculumChapterSeedSchema>;
export type CurriculumTopicSeed = z.infer<typeof curriculumTopicSeedSchema>;

export const curriculumVersionFormSchema = z.object({
  id: z.string().optional(),
  boardCode: z.string().trim().min(1, "Board code is required"),
  boardName: z.string().trim().min(1, "Board name is required"),
  academicYear: z.string().trim().min(1, "Academic year is required"),
  version: z.string().trim().min(1, "Version is required"),
  name: z.string().trim().min(1, "Name is required"),
  sourceUrl: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().optional().transform((value) => value || undefined),
});

export const curriculumClassFormSchema = z.object({
  id: z.string().optional(),
  versionId: z.string().min(1),
  level: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  stableKey: z.string().trim().optional().transform((value) => value || undefined),
  sequence: z.coerce.number().int().min(0).default(0),
});

export const curriculumSubjectFormSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1),
  name: z.string().trim().min(1),
  stableKey: z.string().trim().optional().transform((value) => value || undefined),
  sequence: z.coerce.number().int().min(0).default(0),
  isDefaultSelected: z.coerce.boolean().default(false),
  isOptional: z.coerce.boolean().default(false),
  isLanguageSubject: z.coerce.boolean().default(false),
  sourceUrl: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  verificationStatus: curriculumVerificationStatusSchema.default("REVIEW_REQUIRED"),
});

export const curriculumChapterFormSchema = z.object({
  id: z.string().optional(),
  subjectId: z.string().min(1),
  name: z.string().trim().min(1),
  stableKey: z.string().trim().optional().transform((value) => value || undefined),
  sequence: z.coerce.number().int().min(0).default(0),
  sourceUrl: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  verificationStatus: curriculumVerificationStatusSchema.default("REVIEW_REQUIRED"),
  bulkItems: z.string().trim().optional().transform((value) => value || undefined),
});

export const curriculumTopicFormSchema = z.object({
  id: z.string().optional(),
  chapterId: z.string().min(1),
  name: z.string().trim().min(1),
  stableKey: z.string().trim().optional().transform((value) => value || undefined),
  sequence: z.coerce.number().int().min(0).default(0),
  sourceUrl: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  verificationStatus: curriculumVerificationStatusSchema.default("REVIEW_REQUIRED"),
  bulkItems: z.string().trim().optional().transform((value) => value || undefined),
});

export const curriculumImportFormSchema = z.object({
  dryRun: z.coerce.boolean().default(false),
});

export const curriculumAssignmentSelectionSchema = z.object({
  curriculumVersionId: z.string().optional(),
  curriculumClassId: z.string().optional(),
  selectedSubjectIds: z.array(z.string()).default([]),
});

export const curriculumSelectionSchema = z.object({
  curriculumVersionId: z.string().min(1),
  curriculumClassId: z.string().min(1),
  selectedSubjectIds: z.array(z.string()).min(1, "Choose at least one subject"),
});

export function normalizeStableKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

