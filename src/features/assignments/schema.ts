import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);

export const assignmentSourceValues = ["PARENT", "SELF"] as const;
export const assignmentTypeValues = ["STUDY", "PRACTICE", "REVISION", "TEST"] as const;
export const assignmentStatusValues = ["PLANNED", "IN_PROGRESS", "COMPLETED", "OVERDUE", "SKIPPED"] as const;
export const assignmentPriorityValues = ["LOW", "MEDIUM", "HIGH"] as const;

export const assignmentStatusSchema = z.enum(assignmentStatusValues);
export const assignmentTypeSchema = z.enum(assignmentTypeValues);
export const assignmentSourceSchema = z.enum(assignmentSourceValues);
export const assignmentPrioritySchema = z.enum(assignmentPriorityValues);

export const assignmentFormSchema = z
  .object({
    childId: z.string().min(1),
    topicId: z.string().min(1),
    type: assignmentTypeSchema,
    priority: assignmentPrioritySchema.default("MEDIUM"),
    plannedDate: z.coerce.date().optional().or(z.literal("").transform(() => undefined)),
    dueDate: z.coerce.date().optional().or(z.literal("").transform(() => undefined)),
    instructions: optionalText,
    studySessionTarget: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    practiceSessionTarget: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    questionTarget: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    maximumMarks: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    passingMarks: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    durationMinutes: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    score: z.coerce.number().int().min(0).optional().or(z.literal("").transform(() => undefined)),
  })
  .refine(
    (value) =>
    value.type !== "TEST" ||
    Boolean(value.maximumMarks) ||
    Boolean(value.passingMarks) ||
    value.score !== undefined ||
    Boolean(value.durationMinutes),
    {
      message: "Add at least one test detail",
      path: ["maximumMarks"],
    },
  );

export const assignmentScoreSchema = z.object({
  id: z.string().min(1),
  score: z.coerce.number().int().min(0),
});

export const assignmentStatusUpdateSchema = z.object({
  id: z.string().min(1),
});

export const assignmentListParamsSchema = z.object({
  childId: z.string().optional(),
  q: z.string().optional(),
});

export const assignmentSelectionSchema = z.object({
  childId: z.string().optional(),
  subjectId: z.string().optional(),
  chapterId: z.string().optional(),
  topicId: z.string().optional(),
  type: assignmentTypeSchema.optional(),
});
