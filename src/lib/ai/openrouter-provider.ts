import "server-only";

import { z } from "zod";
import {
  aiEvaluateAnswerSchema,
  aiGeneratedTestSchema,
  aiTeachResultSchema,
  onlineTestAnswerEvaluationSchema,
  onlineTestPaperReviewSchema,
  onlineTestSectionGenerationSchema,
} from "@/features/ai/schema";
import { appUrl } from "@/lib/app-url";
import { getAiConfig } from "./config";
import { buildEvaluateAnswerPrompt } from "./prompts/evaluate-answer";
import { buildEvaluateSubjectiveAnswerPrompt } from "./prompts/evaluate-subjective-answer";
import { buildGenerateTestPrompt } from "./prompts/generate-test";
import { buildGenerateTestPaperSectionPrompt } from "./prompts/generate-test-paper-section";
import { buildReviewTestPaperPrompt } from "./prompts/review-test-paper";
import { buildTeachTopicPrompt } from "./prompts/teach-topic";
import {
  AiProviderError,
  isRetryableAiProviderError,
  type AiLearningProvider,
  type EvaluateSubjectiveAnswerInput,
  type EvaluateTestInput,
  type GeneratedTest,
  type GeneratedTestPaperSection,
  type GenerateTestInput,
  type GenerateTestPaperSectionInput,
  type ReviewTestPaperInput,
  type SubjectiveAnswerEvaluation,
  type TeachTopicInput,
  type TeachTopicResult,
  type TestEvaluation,
  type TestPaperReview,
} from "./provider";

type OpenRouterCallOptions = {
  maxOutputTokens?: number;
};

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function callOpenRouter(system: string, user: string, options: OpenRouterCallOptions = {}) {
  const config = getAiConfig();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.openRouterApiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": appUrl(),
    "X-Title": "Study Tracker",
  };

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.openRouterModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
        max_tokens: options.maxOutputTokens ?? config.maxOutputTokens,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    });
  } catch (error) {
    throw new AiProviderError(
      `OpenRouter request failed: ${error instanceof Error ? error.message : String(error)}`,
      "openrouter",
      null,
      true,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    throw new AiProviderError(
      `OpenRouter provider error: ${response.status}${body ? ` - ${body.slice(0, 500)}` : ""}`,
      "openrouter",
      response.status,
      retryable,
    );
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("Empty OpenRouter response");
  return text;
}

async function callWithValidation<T>(
  buildPrompt: () => { system: string; user: string },
  schema: z.ZodType<T>,
  retryCount: number,
  options: OpenRouterCallOptions = {},
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const { system, user } = buildPrompt();
      const raw = await callOpenRouter(system, user, options);
      return schema.parse(JSON.parse(extractJson(raw)));
    } catch (error) {
      if (error instanceof AiProviderError && !isRetryableAiProviderError(error)) throw error;
      lastError = error instanceof SyntaxError
        ? new Error("OpenRouter returned malformed JSON. Please try again.")
        : error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("The OpenRouter backup could not respond right now.");
}

export class OpenRouterAiLearningProvider implements AiLearningProvider {
  getLastProviderInfo() {
    const config = getAiConfig();
    return { provider: "openrouter" as const, model: config.openRouterModel };
  }

  teachTopic(input: TeachTopicInput): Promise<TeachTopicResult> {
    const config = getAiConfig();
    return callWithValidation(() => buildTeachTopicPrompt(input), aiTeachResultSchema, config.internalRetryCount);
  }

  generateTest(input: GenerateTestInput): Promise<GeneratedTest> {
    const config = getAiConfig();
    return callWithValidation(() => buildGenerateTestPrompt(input), aiGeneratedTestSchema, config.internalRetryCount);
  }

  evaluateTest(input: EvaluateTestInput): Promise<TestEvaluation> {
    const config = getAiConfig();
    return callWithValidation(() => buildEvaluateAnswerPrompt(input), aiEvaluateAnswerSchema, config.internalRetryCount);
  }

  generateTestPaperSection(input: GenerateTestPaperSectionInput): Promise<GeneratedTestPaperSection> {
    const config = getAiConfig();
    return callWithValidation(
      () => buildGenerateTestPaperSectionPrompt(input),
      onlineTestSectionGenerationSchema,
      config.testPaperRetryCount,
      { maxOutputTokens: Math.max(config.maxOutputTokens, config.testPaperMaxOutputTokens) },
    );
  }

  reviewTestPaper(input: ReviewTestPaperInput): Promise<TestPaperReview> {
    const config = getAiConfig();
    return callWithValidation(
      () => buildReviewTestPaperPrompt(input),
      onlineTestPaperReviewSchema,
      config.testPaperRetryCount,
      { maxOutputTokens: Math.max(config.maxOutputTokens, config.testPaperMaxOutputTokens) },
    );
  }

  evaluateSubjectiveAnswer(input: EvaluateSubjectiveAnswerInput): Promise<SubjectiveAnswerEvaluation> {
    const config = getAiConfig();
    return callWithValidation(
      () => buildEvaluateSubjectiveAnswerPrompt(input),
      onlineTestAnswerEvaluationSchema,
      config.internalRetryCount,
    );
  }
}
