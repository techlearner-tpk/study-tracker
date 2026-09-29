import "server-only";

import type {
  AiLearningProvider,
  AiProviderInfo,
  EvaluateSubjectiveAnswerInput,
  EvaluateTestInput,
  GeneratedTest,
  GeneratedTestPaperSection,
  GenerateTestInput,
  GenerateTestPaperSectionInput,
  ReviewTestPaperInput,
  SubjectiveAnswerEvaluation,
  TeachTopicInput,
  TeachTopicResult,
  TestEvaluation,
  TestPaperReview,
} from "./provider";
import { isRetryableAiProviderError } from "./provider";

export class FallbackAiLearningProvider implements AiLearningProvider {
  private lastProviderInfo: AiProviderInfo;

  constructor(
    private readonly primary: AiLearningProvider,
    private readonly backup: AiLearningProvider,
  ) {
    this.lastProviderInfo = primary.getLastProviderInfo?.() ?? { provider: "gemini", model: "unknown" };
  }

  getLastProviderInfo() {
    return this.lastProviderInfo;
  }

  private async execute<T>(operation: string, primaryCall: () => Promise<T>, backupCall: () => Promise<T>) {
    try {
      const result = await primaryCall();
      this.lastProviderInfo = this.primary.getLastProviderInfo?.() ?? this.lastProviderInfo;
      return result;
    } catch (error) {
      if (!isRetryableAiProviderError(error)) throw error;
      console.warn("[ai] Primary provider unavailable; using configured backup", {
        operation,
        primaryProvider: error.provider,
        status: error.status,
      });
      const result = await backupCall();
      this.lastProviderInfo = this.backup.getLastProviderInfo?.() ?? { provider: "openrouter", model: "unknown" };
      return result;
    }
  }

  teachTopic(input: TeachTopicInput): Promise<TeachTopicResult> {
    return this.execute("teachTopic", () => this.primary.teachTopic(input), () => this.backup.teachTopic(input));
  }

  generateTest(input: GenerateTestInput): Promise<GeneratedTest> {
    return this.execute("generateTest", () => this.primary.generateTest(input), () => this.backup.generateTest(input));
  }

  evaluateTest(input: EvaluateTestInput): Promise<TestEvaluation> {
    return this.execute("evaluateTest", () => this.primary.evaluateTest(input), () => this.backup.evaluateTest(input));
  }

  generateTestPaperSection(input: GenerateTestPaperSectionInput): Promise<GeneratedTestPaperSection> {
    return this.execute(
      "generateTestPaperSection",
      () => this.primary.generateTestPaperSection(input),
      () => this.backup.generateTestPaperSection(input),
    );
  }

  reviewTestPaper(input: ReviewTestPaperInput): Promise<TestPaperReview> {
    return this.execute("reviewTestPaper", () => this.primary.reviewTestPaper(input), () => this.backup.reviewTestPaper(input));
  }

  evaluateSubjectiveAnswer(input: EvaluateSubjectiveAnswerInput): Promise<SubjectiveAnswerEvaluation> {
    return this.execute(
      "evaluateSubjectiveAnswer",
      () => this.primary.evaluateSubjectiveAnswer(input),
      () => this.backup.evaluateSubjectiveAnswer(input),
    );
  }
}
