import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAiConfig, resetAiConfigForTests } from "@/lib/ai/config";

describe("ai config", () => {
  beforeEach(() => {
    resetAiConfigForTests();
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_TOPIC_PROMPT_LIMIT", "5");
    vi.stubEnv("AI_TEST_QUESTION_COUNT", "5");
    vi.stubEnv("AI_MAX_USER_PROMPT_LENGTH", "500");
    vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "1200");
    vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "30000");
    vi.stubEnv("AI_INTERNAL_RETRY_COUNT", "1");
  });

  it("normalizes Gemini model names from URLs and prefixed paths", () => {
    vi.stubEnv("AI_MODEL", "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash");
    expect(getAiConfig().model).toBe("gemini-2.5-flash");

    resetAiConfigForTests();
    vi.stubEnv("AI_MODEL", "models/gemini-2.5-flash");
    expect(getAiConfig().model).toBe("gemini-2.5-flash");

    resetAiConfigForTests();
    vi.stubEnv("AI_MODEL", "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
    expect(getAiConfig().model).toBe("gemini-2.5-flash");

    resetAiConfigForTests();
    vi.stubEnv("AI_MODEL", "v1beta/models/gemini-2.5-flash");
    expect(getAiConfig().model).toBe("gemini-2.5-flash");
  });
});
