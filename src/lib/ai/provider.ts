import { z } from "zod";
import {
  aiEvaluateAnswerSchema,
  aiGeneratedTestSchema,
  aiTeachResultSchema,
  onlineTestAnswerEvaluationSchema,
  onlineTestPaperReviewSchema,
  onlineTestSectionGenerationSchema,
} from "@/features/ai/schema";

export type TeachTopicInput = {
  className: string;
  boardName?: string | null;
  subjectName: string;
  chapterName: string;
  topicName: string;
  topicDescription?: string | null;
};

export type TeachTopicResult = z.infer<typeof aiTeachResultSchema>;

export type GenerateTestInput = TeachTopicInput & {
  questionCount: number;
};

export type GeneratedTest = z.infer<typeof aiGeneratedTestSchema>;

export type EvaluateTestInput = {
  className: string;
  boardName?: string | null;
  subjectName: string;
  chapterName: string;
  topicName: string;
  topicDescription?: string | null;
  questionType: string;
  question: string;
  expectedAnswer: string;
  questionExplanation: string;
  submittedAnswer: string;
};

export type TestEvaluation = z.infer<typeof aiEvaluateAnswerSchema>;

export type TestPaperQuestionSlot = {
  clientQuestionId: string;
  subject: string;
  className: string;
  boardName?: string | null;
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  questionType: string;
  marks: number;
  difficulty: string;
};

export type GenerateTestPaperSectionInput = {
  sectionName: string;
  sectionInstructions?: string | null;
  slots: TestPaperQuestionSlot[];
};

export type GeneratedTestPaperSection = z.infer<typeof onlineTestSectionGenerationSchema>;

export type ReviewTestPaperInput = {
  className: string;
  boardName?: string | null;
  subjectName: string;
  totalMarks: number;
  questions: GeneratedTestPaperSection["questions"];
};

export type TestPaperReview = z.infer<typeof onlineTestPaperReviewSchema>;

export type EvaluateSubjectiveAnswerInput = {
  className: string;
  boardName?: string | null;
  subjectName: string;
  chapterName: string;
  topicName: string;
  questionType: string;
  questionText: string;
  maximumMarks: number;
  correctAnswer: unknown;
  markingScheme: unknown;
  studentAnswer: string;
};

export type SubjectiveAnswerEvaluation = z.infer<typeof onlineTestAnswerEvaluationSchema>;

export interface AiLearningProvider {
  teachTopic(input: TeachTopicInput): Promise<TeachTopicResult>;
  generateTest(input: GenerateTestInput): Promise<GeneratedTest>;
  evaluateTest(input: EvaluateTestInput): Promise<TestEvaluation>;
  generateTestPaperSection(input: GenerateTestPaperSectionInput): Promise<GeneratedTestPaperSection>;
  reviewTestPaper(input: ReviewTestPaperInput): Promise<TestPaperReview>;
  evaluateSubjectiveAnswer(input: EvaluateSubjectiveAnswerInput): Promise<SubjectiveAnswerEvaluation>;
}
