import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resetAiConfigForTests } from "@/lib/ai/config";
import { FallbackAiLearningProvider } from "@/lib/ai/fallback-provider";
import { createAiLearningProvider } from "@/lib/ai/gemini-provider";
import { OpenRouterAiLearningProvider } from "@/lib/ai/openrouter-provider";

describe("OpenRouter AI provider", () => {
  beforeEach(() => {
    resetAiConfigForTests();
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("AI_MODEL", "gemini-2.5-flash");
    vi.stubEnv("AI_API_KEY", "gemini-key");
    vi.stubEnv("AI_FALLBACK_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "openrouter-key");
    vi.stubEnv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct");
    vi.stubEnv("OPENROUTER_SITE_URL", "https://study-tracker.example");
    vi.stubEnv("OPENROUTER_APP_NAME", "Study Tracker");
    vi.stubEnv("AI_INTERNAL_RETRY_COUNT", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetAiConfigForTests();
  });

  it("requests structured grading from the configured Llama model", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            awardedMarks: 2,
            maximumMarks: 2,
            confidence: 0.9,
            matchedCriteria: ["Correct reasoning"],
            missingCriteria: [],
            feedback: "Correct answer.",
          }),
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new OpenRouterAiLearningProvider().evaluateSubjectiveAnswer({
      className: "Class 8",
      subjectName: "Mathematics",
      chapterName: "Geometry",
      topicName: "Polygons",
      questionType: "SHORT_ANSWER",
      questionText: "What is the angle sum of a triangle?",
      maximumMarks: 2,
      correctAnswer: "180 degrees",
      markingScheme: [{ criterion: "States 180 degrees", marks: 2 }],
      studentAnswer: "180 degrees",
    });

    expect(result.awardedMarks).toBe(2);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(request.headers).toMatchObject({
      Authorization: "Bearer openrouter-key",
      "HTTP-Referer": "https://study-tracker.example",
      "X-Title": "Study Tracker",
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: "meta-llama/llama-3.1-8b-instruct",
      response_format: { type: "json_object" },
    });
  });

  it("enables the configured backup in the application provider factory", () => {
    expect(createAiLearningProvider()).toBeInstanceOf(FallbackAiLearningProvider);
  });
});
