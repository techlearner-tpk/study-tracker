import { z } from "zod";
import { aiEvaluateAnswerSchema, aiGeneratedTestSchema, aiTeachResultSchema } from "@/features/ai/schema";

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
  topicName: string;
  question: string;
  expectedAnswer: string;
  submittedAnswer: string;
};

export type TestEvaluation = z.infer<typeof aiEvaluateAnswerSchema>;

export interface AiLearningProvider {
  teachTopic(input: TeachTopicInput): Promise<TeachTopicResult>;
  generateTest(input: GenerateTestInput): Promise<GeneratedTest>;
  evaluateTest(input: EvaluateTestInput): Promise<TestEvaluation>;
}
