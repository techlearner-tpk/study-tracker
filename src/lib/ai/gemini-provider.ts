import "server-only";

import { aiEvaluateAnswerSchema, aiGeneratedTestSchema, aiTeachResultSchema } from "@/features/ai/schema";
import { getAiConfig } from "./config";
import { buildEvaluateAnswerPrompt } from "./prompts/evaluate-answer";
import { buildGenerateTestPrompt } from "./prompts/generate-test";
import { buildTeachTopicPrompt } from "./prompts/teach-topic";
import { z } from "zod";
import type {
  AiLearningProvider,
  EvaluateTestInput,
  GeneratedTest,
  TeachTopicInput,
  TeachTopicResult,
  TestEvaluation,
  GenerateTestInput,
} from "./provider";

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function readGeminiText(response: Response) {
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
  if (!text) {
    throw new Error("Empty AI response");
  }
  return text;
}

async function callGemini(system: string, user: string) {
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
        maxOutputTokens: config.maxOutputTokens,
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
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const { system, user } = buildPrompt();
      const raw = await callGemini(system, user);
      const parsed = JSON.parse(extractJson(raw));
      return schema.parse(parsed);
    } catch (error) {
      lastError = error;
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
}

export function createAiLearningProvider() {
  const config = getAiConfig();
  if (config.provider !== "gemini") {
    throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
  return new GeminiAiLearningProvider();
}
