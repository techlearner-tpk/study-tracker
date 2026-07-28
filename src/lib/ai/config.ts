import "server-only";

import { z } from "zod";

const envSchema = z.object({
  AI_ENABLED: z.string().default("false"),
  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  AI_MODEL: z.string().trim().default(""),
  AI_API_KEY: z.string().trim().default(""),
  AI_TOPIC_PROMPT_LIMIT: z.coerce.number().int().positive().default(5),
  AI_TEST_QUESTION_COUNT: z.coerce.number().int().positive().default(5),
  AI_MAX_USER_PROMPT_LENGTH: z.coerce.number().int().positive().default(500),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(1200),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  AI_INTERNAL_RETRY_COUNT: z.coerce.number().int().min(0).default(1),
  AI_TEST_PAPER_ENABLED: z.string().default("true"),
  AI_TEST_PAPER_MAX_QUESTIONS: z.coerce.number().int().positive().default(30),
  AI_TEST_PAPER_RETRY_COUNT: z.coerce.number().int().min(0).default(2),
  AI_EVALUATION_REVIEW_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),
  AI_TEST_AUTOSAVE_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
});

export type AiConfig = {
  enabled: boolean;
  provider: "gemini";
  model: string;
  apiKey: string;
  topicPromptLimit: number;
  testQuestionCount: number;
  maxUserPromptLength: number;
  maxOutputTokens: number;
  requestTimeoutMs: number;
  internalRetryCount: number;
  testPaperEnabled: boolean;
  testPaperMaxQuestions: number;
  testPaperRetryCount: number;
  evaluationReviewThreshold: number;
  testAutosaveIntervalMs: number;
};

let cachedConfig: AiConfig | null = null;

function normalizeGeminiModelName(model: string) {
  const safeDecode = (input: string) => {
    try {
      return decodeURIComponent(input);
    } catch {
      return input;
    }
  };

  const value = safeDecode(model.trim());
  if (!value) return value;

  const stripSuffixes = (input: string) =>
    input
      .replace(/^v1beta\/models\//, "")
      .replace(/^v1\/models\//, "")
      .replace(/^models\//, "")
      .replace(/^\/+/, "")
      .split("?")[0]
      .split("#")[0]
      .split(":")[0]
      .split("/")[0];

  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length) {
      const lastSegment = segments[segments.length - 1];
      return stripSuffixes(lastSegment);
    }
  } catch {
    // Not a URL, keep going.
  }

  const rawSegments = value.split("/").filter(Boolean);
  if (rawSegments.length) {
    return stripSuffixes(rawSegments[rawSegments.length - 1]);
  }

  return stripSuffixes(safeDecode(value));
}

function assertGeminiModelName(model: string) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(model)) {
    throw new Error(
      `AI_MODEL must be a plain Gemini model id like "gemini-2.5-flash". Received: ${model || "<empty>"}`,
    );
  }
}

export function getAiConfig(): AiConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = envSchema.parse(process.env);
  const enabled = parsed.AI_ENABLED === "true";

  if (enabled) {
    if (!parsed.AI_MODEL) {
      throw new Error("AI_MODEL must be set when AI_ENABLED=true");
    }
    if (!parsed.AI_API_KEY) {
      throw new Error("AI_API_KEY must be set when AI_ENABLED=true");
    }
  }

  cachedConfig = {
    enabled,
    provider: parsed.AI_PROVIDER,
    model: (() => {
      const normalized = normalizeGeminiModelName(parsed.AI_MODEL);
      assertGeminiModelName(normalized);
      return normalized;
    })(),
    apiKey: parsed.AI_API_KEY,
    topicPromptLimit: parsed.AI_TOPIC_PROMPT_LIMIT,
    testQuestionCount: parsed.AI_TEST_QUESTION_COUNT,
    maxUserPromptLength: parsed.AI_MAX_USER_PROMPT_LENGTH,
    maxOutputTokens: parsed.AI_MAX_OUTPUT_TOKENS,
    requestTimeoutMs: parsed.AI_REQUEST_TIMEOUT_MS,
    internalRetryCount: parsed.AI_INTERNAL_RETRY_COUNT,
    testPaperEnabled: parsed.AI_TEST_PAPER_ENABLED === "true",
    testPaperMaxQuestions: parsed.AI_TEST_PAPER_MAX_QUESTIONS,
    testPaperRetryCount: parsed.AI_TEST_PAPER_RETRY_COUNT,
    evaluationReviewThreshold: parsed.AI_EVALUATION_REVIEW_THRESHOLD,
    testAutosaveIntervalMs: parsed.AI_TEST_AUTOSAVE_INTERVAL_MS,
  };

  return cachedConfig;
}

export function resetAiConfigForTests() {
  cachedConfig = null;
}
