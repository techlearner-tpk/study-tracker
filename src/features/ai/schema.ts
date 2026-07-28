import { z } from "zod";

export const aiQuestionTypeValues = ["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"] as const;
export const onlineTestQuestionTypeValues = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_IN_THE_BLANK",
  "VERY_SHORT_ANSWER",
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "NUMERICAL",
  "CASE_BASED",
  "ASSERTION_REASON",
  "READING_COMPREHENSION",
  "GRAMMAR",
  "WRITING",
  "VOCABULARY",
] as const;

export const onlineTestDifficultyValues = ["EASY", "MEDIUM", "HARD", "MIXED"] as const;
export const aiLearningModeValues = ["TEACH", "TEST"] as const;
export const aiSessionStatusValues = ["ACTIVE", "COMPLETED", "FAILED"] as const;
export const aiLearningMessageRoleValues = ["SYSTEM", "CHILD", "ASSISTANT"] as const;

export const aiTeachCheckQuestionSchema = z.object({
  question: z.string().min(1),
  expectedAnswer: z.string().min(1),
  hint: z.string().min(1),
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
  id: z.preprocess((value) => {
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value.trim();
    return value;
  }, z.string().min(1)),
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
  scorePercentage: z.number().int().min(0).max(100),
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

const markingCriterionSchema = z.object({
  criterion: z.string().min(1),
  marks: z.number().positive(),
});

export const onlineTestGeneratedQuestionSchema = z.object({
  clientQuestionId: z.string().min(1),
  subject: z.string().min(1),
  chapterId: z.string().min(1),
  topicId: z.string().min(1),
  questionType: z.enum(onlineTestQuestionTypeValues),
  questionText: z.string().min(1),
  options: z.array(z.string().min(1)).nullable().optional(),
  marks: z.number().int().positive(),
  difficulty: z.enum(onlineTestDifficultyValues),
  correctAnswer: z.unknown(),
  acceptedAnswers: z.array(z.string().min(1)).optional(),
  markingScheme: z.array(markingCriterionSchema).min(1),
  explanation: z.string().min(1),
});

export const onlineTestSectionGenerationSchema = z.object({
  questions: z.array(onlineTestGeneratedQuestionSchema).min(1),
});

export const onlineTestQuestionReviewSchema = z.object({
  clientQuestionId: z.string().min(1),
  approved: z.boolean(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  issueCode: z.enum([
    "OUT_OF_SYLLABUS",
    "WRONG_CLASS_LEVEL",
    "WRONG_TOPIC",
    "INCORRECT_ANSWER",
    "INVALID_MARKING_SCHEME",
    "AMBIGUOUS_QUESTION",
    "DUPLICATE_QUESTION",
    "ANSWER_LEAKAGE",
    "DIFFICULTY_MISMATCH",
    "MARKS_MISMATCH",
    "LANGUAGE_QUALITY",
    "UNSAFE_CONTENT",
  ]).optional(),
  message: z.string().optional(),
  suggestedCorrection: z.string().optional(),
});

export const onlineTestPaperReviewSchema = z.object({
  approved: z.boolean(),
  paperIssues: z.array(z.string()).default([]),
  questionReviews: z.array(onlineTestQuestionReviewSchema),
});

export const onlineTestAnswerEvaluationSchema = z.object({
  awardedMarks: z.number().min(0),
  maximumMarks: z.number().positive(),
  confidence: z.number().min(0).max(1),
  matchedCriteria: z.array(z.string()).default([]),
  missingCriteria: z.array(z.string()).default([]),
  feedback: z.string().min(1),
});

export const createTestTemplateSchema = z.object({
  name: z.string().trim().min(1),
  subjectName: z.enum(["Mathematics", "Science", "English"]),
  totalMarks: z.coerce.number().int().positive(),
  durationMinutes: z.coerce.number().int().positive(),
  difficulty: z.enum(onlineTestDifficultyValues).default("MIXED"),
});

export const createTestTemplateSectionSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().trim().min(1),
  instructions: z.string().trim().optional(),
});

export const createTestTemplateRuleSchema = z.object({
  sectionId: z.string().min(1),
  questionType: z.enum(onlineTestQuestionTypeValues),
  marksPerQuestion: z.coerce.number().int().positive(),
  questionCount: z.coerce.number().int().positive(),
  difficulty: z.enum(onlineTestDifficultyValues).default("MEDIUM"),
});

export const templateIdSchema = z.object({
  templateId: z.string().min(1),
});

export const generateOnlineTestPaperSchema = z.object({
  childId: z.string().min(1),
  subjectId: z.string().min(1),
  templateId: z.string().min(1),
  source: z.enum(["ASSIGNED_BY_PARENT", "SELF_PRACTICE"]),
  title: z.string().trim().optional(),
  dueAt: z.string().optional(),
  topicIds: z.union([z.string(), z.array(z.string())]).transform((value) => (Array.isArray(value) ? value : [value]).filter(Boolean)),
});

export const onlineTestPaperIdSchema = z.object({
  paperId: z.string().min(1),
});

export const onlineTestSubmitSchema = z.object({
  attemptId: z.string().min(1),
  paperId: z.string().min(1),
});
