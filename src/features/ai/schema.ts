import { z } from "zod";

export const aiQuestionTypeValues = ["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"] as const;
export const aiLearningModeValues = ["TEACH", "TEST"] as const;
export const aiSessionStatusValues = ["ACTIVE", "COMPLETED", "FAILED"] as const;
export const aiLearningMessageRoleValues = ["SYSTEM", "CHILD", "ASSISTANT"] as const;

export const aiTeachCheckQuestionSchema = z.object({
  question: z.string().min(1),
  expectedAnswer: z.string().min(1),
  hint: z.string().min(1),
});

export const aiTeachLegacySectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
});

export const aiTeachLegacyResultSchema = z.object({
  title: z.string().min(1),
  sections: z.array(aiTeachLegacySectionSchema).min(1),
  suggestedActions: z.array(z.string().min(1)).min(1),
  checkQuestion: z.string().min(1),
});

export const aiTeachResultSchema = z.object({
  title: z.string().min(1),
  learningGoal: z.string().min(1),
  prerequisite: z.string().min(1),
  explanation: z.string().min(1),
  example: z.string().min(1),
  mistake: z.string().min(1),
  practice: z.string().min(1),
  suggestedActions: z.array(z.string().min(1)).min(1).max(4),
  checkQuestion: aiTeachCheckQuestionSchema,
});

export const aiQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(aiQuestionTypeValues),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
});

export const aiGeneratedTestSchema = z.object({
  title: z.string().min(1),
  questions: z.array(aiQuestionSchema).min(1),
});

export const aiEvaluateAnswerSchema = z.object({
  isCorrect: z.boolean(),
  explanation: z.string().min(1),
});

export const aiTeachMessageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().trim().min(1),
  requestId: z.string().min(1),
});

export const aiTestSubmissionSchema = z.object({
  attemptId: z.string().min(1),
  sessionId: z.string().min(1),
  requestId: z.string().min(1),
});

export const aiTeachRequestSchema = z.object({
  topicId: z.string().min(1),
  assignmentId: z.string().optional().or(z.literal("").transform(() => undefined)),
});

export const aiTestRequestSchema = z.object({
  topicId: z.string().min(1),
  assignmentId: z.string().optional().or(z.literal("").transform(() => undefined)),
});

export const aiTextAnswerSchema = z.object({
  answer: z.string().trim().optional().transform((value) => value || ""),
});
