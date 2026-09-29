import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { FallbackAiLearningProvider } from "@/lib/ai/fallback-provider";
import { AiProviderError, type AiLearningProvider } from "@/lib/ai/provider";

const input = {
  className: "Class 8",
  subjectName: "Mathematics",
  chapterName: "Geometry",
  topicName: "Polygons",
};

function providerWithTeach(teachTopic: ReturnType<typeof vi.fn>, provider: "gemini" | "openrouter") {
  return {
    teachTopic,
    getLastProviderInfo: () => ({ provider, model: provider === "gemini" ? "gemini-2.5-flash" : "meta-llama/llama-3.1-8b-instruct" }),
  } as unknown as AiLearningProvider;
}

describe("AI provider fallback", () => {
  it("uses OpenRouter after a retryable Gemini outage", async () => {
    const primaryCall = vi.fn().mockRejectedValue(new AiProviderError("Gemini unavailable", "gemini", 503, true));
    const backupResult = { title: "Lesson from backup" };
    const backupCall = vi.fn().mockResolvedValue(backupResult);
    const provider = new FallbackAiLearningProvider(
      providerWithTeach(primaryCall, "gemini"),
      providerWithTeach(backupCall, "openrouter"),
    );

    await expect(provider.teachTopic(input)).resolves.toBe(backupResult);
    expect(backupCall).toHaveBeenCalledOnce();
    expect(provider.getLastProviderInfo()).toEqual({
      provider: "openrouter",
      model: "meta-llama/llama-3.1-8b-instruct",
    });
  });

  it("fails fast and does not use backup for permanent Gemini errors", async () => {
    const error = new AiProviderError("Invalid Gemini model", "gemini", 400, false);
    const primaryCall = vi.fn().mockRejectedValue(error);
    const backupCall = vi.fn();
    const provider = new FallbackAiLearningProvider(
      providerWithTeach(primaryCall, "gemini"),
      providerWithTeach(backupCall, "openrouter"),
    );

    await expect(provider.teachTopic(input)).rejects.toBe(error);
    expect(backupCall).not.toHaveBeenCalled();
  });
});
