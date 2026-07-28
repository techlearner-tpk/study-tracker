import "server-only";

import {
  aiEvaluateAnswerSchema,
  aiGeneratedTestSchema,
  aiTeachResultSchema,
  onlineTestAnswerEvaluationSchema,
  onlineTestPaperReviewSchema,
  onlineTestSectionGenerationSchema,
} from "@/features/ai/schema";
import { getAiConfig } from "./config";
import { buildEvaluateAnswerPrompt } from "./prompts/evaluate-answer";
import { buildEvaluateSubjectiveAnswerPrompt } from "./prompts/evaluate-subjective-answer";
import { buildGenerateTestPrompt } from "./prompts/generate-test";
import { buildGenerateTestPaperSectionPrompt } from "./prompts/generate-test-paper-section";
import { buildReviewTestPaperPrompt } from "./prompts/review-test-paper";
import { buildTeachTopicPrompt } from "./prompts/teach-topic";
import { z } from "zod";
import type {
  AiLearningProvider,
  EvaluateTestInput,
  EvaluateSubjectiveAnswerInput,
  GeneratedTestPaperSection,
  GeneratedTest,
  GenerateTestPaperSectionInput,
  TeachTopicInput,
  TeachTopicResult,
  TestEvaluation,
  GenerateTestInput,
  ReviewTestPaperInput,
  SubjectiveAnswerEvaluation,
  TestPaperReview,
} from "./provider";

type GeminiCallOptions = {
  maxOutputTokens?: number;
};

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function readGeminiText(response: Response) {
  const json = await response.json();
  const candidate = json?.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error("AI response was cut off before it finished. Increase AI_TEST_PAPER_MAX_OUTPUT_TOKENS or use a smaller test template.");
  }
  const text = candidate?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
  if (!text) {
    throw new Error("Empty AI response");
  }
  return text;
}

async function callGemini(system: string, user: string, options: GeminiCallOptions = {}) {
  const config = getAiConfig();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: user }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: options.maxOutputTokens ?? config.maxOutputTokens,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(config.requestTimeoutMs),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`AI provider error: ${response.status}${body ? ` - ${body.slice(0, 500)}` : ""}`);
  }

  return readGeminiText(response);
}

async function callWithValidation<T>(
  buildPrompt: () => { system: string; user: string },
  schema: z.ZodType<T>,
  retryCount: number,
  options: GeminiCallOptions = {},
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const { system, user } = buildPrompt();
      const raw = await callGemini(system, user, options);
      const parsed = JSON.parse(extractJson(raw));
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        lastError = new Error("AI returned malformed JSON. Please try again; if it repeats, reduce the test size or increase AI_TEST_PAPER_MAX_OUTPUT_TOKENS.");
      } else {
        lastError = error;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("The AI tutor could not respond right now. Please try again.");
}

export class GeminiAiLearningProvider implements AiLearningProvider {
  async teachTopic(input: TeachTopicInput): Promise<TeachTopicResult> {
    const config = getAiConfig();
    return callWithValidation(
      () => buildTeachTopicPrompt(input),
      aiTeachResultSchema,
      config.internalRetryCount,
    );
  }

  async generateTest(input: GenerateTestInput): Promise<GeneratedTest> {
    const config = getAiConfig();
    return callWithValidation(
      () => buildGenerateTestPrompt(input),
      aiGeneratedTestSchema,
      config.internalRetryCount,
    );
  }

  async evaluateTest(input: EvaluateTestInput): Promise<TestEvaluation> {
    const config = getAiConfig();
    return callWithValidation(
      () => buildEvaluateAnswerPrompt(input),
      aiEvaluateAnswerSchema,
      config.internalRetryCount,
    );
  }

  async generateTestPaperSection(input: GenerateTestPaperSectionInput): Promise<GeneratedTestPaperSection> {
    const config = getAiConfig();
    return callWithValidation(
      () => buildGenerateTestPaperSectionPrompt(input),
      onlineTestSectionGenerationSchema,
      config.testPaperRetryCount,
      { maxOutputTokens: Math.max(config.maxOutputTokens, config.testPaperMaxOutputTokens) },
    );
  }

  async reviewTestPaper(input: ReviewTestPaperInput): Promise<TestPaperReview> {
    const config = getAiConfig();
    return callWithValidation(
      () => buildReviewTestPaperPrompt(input),
      onlineTestPaperReviewSchema,
      config.testPaperRetryCount,
      { maxOutputTokens: Math.max(config.maxOutputTokens, config.testPaperMaxOutputTokens) },
    );
  }

  async evaluateSubjectiveAnswer(input: EvaluateSubjectiveAnswerInput): Promise<SubjectiveAnswerEvaluation> {
    const config = getAiConfig();
    return callWithValidation(
      () => buildEvaluateSubjectiveAnswerPrompt(input),
      onlineTestAnswerEvaluationSchema,
      config.internalRetryCount,
    );
  }
}

export function createAiLearningProvider() {
  const config = getAiConfig();
  if (config.provider !== "gemini") {
    throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
  return new GeminiAiLearningProvider();
}
