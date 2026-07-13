import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);

export const childSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  className: z.string().trim().min(1, "Class is required"),
  school: optionalText,
  themeColor: optionalText,
  kidEmail: z.string().trim().email("Enter a valid kid email").optional().or(z.literal("").transform(() => undefined)),
});

export const subjectSchema = z.object({
  id: z.string().optional(),
  childId: z.string().min(1),
  name: z.string().trim().min(1, "Subject name is required"),
  color: optionalText,
});

export const chapterSchema = z.object({
  id: z.string().optional(),
  subjectId: z.string().min(1),
  name: z.string().trim().min(1, "Chapter name is required"),
  order: z.coerce.number().int().min(0).default(0),
});

export const topicSchema = z.object({
  id: z.string().optional(),
  chapterId: z.string().min(1),
  name: z.string().trim().min(1, "Topic name is required"),
  description: optionalText,
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
  confidenceRating: z.coerce.number().int().min(1).max(5).optional().or(z.literal("").transform(() => undefined)),
  notes: optionalText,
});

export const studySessionSchema = z
  .object({
    topicId: z.string().min(1),
    assignmentId: z.string().optional().or(z.literal("").transform(() => undefined)),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    durationMinutes: z.coerce.number().int().positive("Duration must be positive"),
    notes: optionalText,
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const practiceSessionSchema = z
  .object({
    topicId: z.string().min(1),
    assignmentId: z.string().optional().or(z.literal("").transform(() => undefined)),
    date: z.coerce.date(),
    durationMinutes: z.coerce.number().int().positive(),
    questionsAttempted: z.coerce.number().int().min(0).optional().or(z.literal("").transform(() => undefined)),
    questionsCorrect: z.coerce.number().int().min(0).optional().or(z.literal("").transform(() => undefined)),
    notes: optionalText,
  })
  .refine(
    (value) =>
      value.questionsAttempted === undefined ||
      value.questionsCorrect === undefined ||
      value.questionsCorrect <= value.questionsAttempted,
    {
      message: "Correct answers cannot exceed attempted answers",
      path: ["questionsCorrect"],
    },
  );

export const revisionSessionSchema = z.object({
  topicId: z.string().min(1),
  assignmentId: z.string().optional().or(z.literal("").transform(() => undefined)),
  date: z.coerce.date(),
  durationMinutes: z.coerce.number().int().positive(),
  notes: optionalText,
});

export const habitGoalSchema = z.object({
  childId: z.string().min(1),
  title: z.string().trim().min(1),
  metric: z.enum(["STUDY_MINUTES_DAILY", "STUDY_DAYS_WEEKLY", "STUDY_SESSION_DAILY"]),
  targetValue: z.coerce.number().int().positive(),
});

export const outcomeGoalSchema = z
  .object({
    childId: z.string().min(1),
    title: z.string().trim().min(1),
    type: z.enum(["COMPLETE_TOPIC", "COMPLETE_CHAPTER"]),
    targetTopicId: optionalText,
    targetChapterId: optionalText,
    dueDate: z.coerce.date().optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((value) => value.type !== "COMPLETE_TOPIC" || Boolean(value.targetTopicId), {
    message: "Choose a topic",
    path: ["targetTopicId"],
  })
  .refine((value) => value.type !== "COMPLETE_CHAPTER" || Boolean(value.targetChapterId), {
    message: "Choose a chapter",
    path: ["targetChapterId"],
  });

export const deleteChildSchema = z.object({
  childId: z.string().min(1),
  childName: z.string().min(1),
  confirmation: z.string().min(1),
}).refine((value) => value.confirmation === value.childName, {
  message: "Type the child name exactly to delete",
  path: ["confirmation"],
});

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
