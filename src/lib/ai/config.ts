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
};

let cachedConfig: AiConfig | null = null;

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
    model: parsed.AI_MODEL,
    apiKey: parsed.AI_API_KEY,
    topicPromptLimit: parsed.AI_TOPIC_PROMPT_LIMIT,
    testQuestionCount: parsed.AI_TEST_QUESTION_COUNT,
    maxUserPromptLength: parsed.AI_MAX_USER_PROMPT_LENGTH,
    maxOutputTokens: parsed.AI_MAX_OUTPUT_TOKENS,
    requestTimeoutMs: parsed.AI_REQUEST_TIMEOUT_MS,
    internalRetryCount: parsed.AI_INTERNAL_RETRY_COUNT,
  };

  return cachedConfig;
}

export function resetAiConfigForTests() {
  cachedConfig = null;
}
