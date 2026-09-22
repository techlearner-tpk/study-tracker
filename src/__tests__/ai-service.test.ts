import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prismaUserFindUnique: vi.fn(),
  prismaChildFindUnique: vi.fn(),
  prismaSubscriptionFindUnique: vi.fn(),
  prismaAiSettingFindUnique: vi.fn(),
  prismaAiTopicUsageFindUnique: vi.fn(),
  getOwnedTopic: vi.fn(),
  getAiConfig: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.prismaUserFindUnique },
    child: { findUnique: mocks.prismaChildFindUnique },
    subscription: { findUnique: mocks.prismaSubscriptionFindUnique },
    aiSetting: { findUnique: mocks.prismaAiSettingFindUnique },
    aiTopicUsage: { findUnique: mocks.prismaAiTopicUsageFindUnique },
  },
}));

vi.mock("@/lib/ownership", () => ({
  getOwnedTopic: mocks.getOwnedTopic,
  getOwnedAssignment: vi.fn(),
}));

vi.mock("@/lib/ai/config", () => ({
  getAiConfig: mocks.getAiConfig,
}));

import { canUseAiFeatures, evaluateSubmittedTestAnswers, getAiUsage, getTopicAiAccessState } from "@/features/ai/service";
import { buildTeachTopicPrompt } from "@/lib/ai/prompts/teach-topic";
import { buildGenerateTestPrompt } from "@/lib/ai/prompts/generate-test";
import { buildEvaluateAnswerPrompt } from "@/lib/ai/prompts/evaluate-answer";

describe("ai service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAiConfig.mockReturnValue({
      enabled: true,
      provider: "gemini",
      model: "gemini-2.5-flash",
      apiKey: "test-key",
      topicPromptLimit: 5,
      testQuestionCount: 5,
      maxUserPromptLength: 500,
      maxOutputTokens: 1200,
      testPaperMaxOutputTokens: 8192,
      requestTimeoutMs: 30000,
      internalRetryCount: 1,
    });
  });

  it("reports remaining topic usage", async () => {
    mocks.prismaAiSettingFindUnique.mockResolvedValue({ topicPromptLimit: 7 });
    mocks.prismaAiTopicUsageFindUnique.mockResolvedValue({ promptCount: 2 });

    await expect(getAiUsage("child_1", "topic_1")).resolves.toMatchObject({
      limit: 7,
      promptCount: 2,
      remaining: 5,
    });
  });

  it("allows access for an active family subscription", async () => {
    mocks.getOwnedTopic.mockResolvedValue({
      id: "topic_1",
      name: "Integers",
      description: null,
      chapter: {
        name: "Numbers",
        subject: {
          name: "Mathematics",
          child: {
            id: "child_1",
            name: "Tisha",
            className: "8",
            userId: "parent_1",
            kidUser: null,
          },
        },
      },
    });
    mocks.prismaUserFindUnique.mockResolvedValue({ id: "parent_1", role: "PARENT", childId: null });
    mocks.prismaSubscriptionFindUnique.mockResolvedValue({
      status: "ACTIVE",
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      expiresAt: null,
    });
    mocks.prismaAiTopicUsageFindUnique.mockResolvedValue({ promptCount: 1 });

    await expect(getTopicAiAccessState("parent_1", "topic_1")).resolves.toMatchObject({
      hasAccess: true,
      remainingUsage: 6,
      limit: 7,
      subscriptionStatus: "ACTIVE",
    });
    expect(mocks.prismaUserFindUnique).not.toHaveBeenCalled();

    await expect(canUseAiFeatures("parent_1")).resolves.toBe(true);
  });

  it("denies access without a subscription", async () => {
    mocks.getOwnedTopic.mockResolvedValue({
      id: "topic_1",
      name: "Integers",
      description: null,
      chapter: {
        name: "Numbers",
        subject: {
          name: "Mathematics",
          child: {
            id: "child_1",
            name: "Tisha",
            className: "8",
            userId: "parent_1",
            kidUser: null,
          },
        },
      },
    });
    mocks.prismaUserFindUnique.mockResolvedValue({ id: "parent_1", role: "PARENT", childId: null });
    mocks.prismaSubscriptionFindUnique.mockResolvedValue(null);
    mocks.prismaAiTopicUsageFindUnique.mockResolvedValue({ promptCount: 0 });

    await expect(getTopicAiAccessState("parent_1", "topic_1")).resolves.toMatchObject({
      hasAccess: false,
      subscriptionStatus: "NONE",
    });

    await expect(canUseAiFeatures("parent_1")).resolves.toBe(false);
  });

  it("builds a topic-specific teach prompt with stronger lesson guidance", () => {
    const prompt = buildTeachTopicPrompt({
      className: "8",
      boardName: "CBSE",
      subjectName: "Mathematics",
      chapterName: "Geometry",
      topicName: "Polygons",
      topicDescription: null,
    });

    expect(prompt.system).toContain("Do not answer with a one-line definition or a vague overview.");
    expect(prompt.system).toContain("Write a real mini-lesson");
    expect(prompt.user).toContain("Geometry -> Polygons");
    expect(prompt.user).toContain("Make the explanation at least 3 sentences long");
  });

  it("builds a topic-specific test prompt without template wording", () => {
    const prompt = buildGenerateTestPrompt({
      className: "8",
      boardName: "CBSE",
      subjectName: "Mathematics",
      chapterName: "Geometry",
      topicName: "Polygons",
      topicDescription: null,
      questionCount: 5,
    });

    expect(prompt.system).toContain("Every question must be specific to the exact topic");
    expect(prompt.system).toContain("Do not use vague placeholders");
    expect(prompt.user).toContain("Do not use generic questions like");
    expect(prompt.user).toContain("Make the set feel like a proper challenge");
  });

  it("builds a teacher-style evaluation prompt with percentage scoring", () => {
    const prompt = buildEvaluateAnswerPrompt({
      className: "8",
      boardName: "CBSE",
      subjectName: "Mathematics",
      chapterName: "Geometry",
      topicName: "Polygons",
      topicDescription: "Interior angle sums",
      questionType: "SHORT_ANSWER",
      question: "Why is a triangle used in the polygon angle-sum formula?",
      expectedAnswer: "A polygon can be split into triangles and each triangle has 180 degrees.",
      questionExplanation: "Checks whether the student understands triangulation.",
      submittedAnswer: "Because shapes can be divided into triangles.",
    });

    expect(prompt.system).toContain("scorePercentage");
    expect(prompt.system).toContain("integer from 0 to 100");
    expect(prompt.user).toContain("Subject: Mathematics");
    expect(prompt.user).toContain("Submitted answer: Because shapes can be divided into triangles.");
  });

  it("uses deterministic scoring for objective answers and AI percentage scoring for short answers", async () => {
    const provider = {
      evaluateTest: vi.fn().mockResolvedValue({
        scorePercentage: 70,
        isCorrect: false,
        explanation: "Good start. Mention that each triangle has 180 degrees.",
      }),
    };

    const result = await evaluateSubmittedTestAnswers({
      test: {
        title: "Polygons test",
        questions: [
          {
            id: "q1",
            type: "MULTIPLE_CHOICE",
            question: "How many sides does a hexagon have?",
            options: ["5", "6", "7", "8"],
            correctAnswer: "6",
            explanation: "A hexagon has six sides.",
          },
          {
            id: "q2",
            type: "TRUE_FALSE",
            question: "A triangle has 3 sides.",
            options: ["True", "False"],
            correctAnswer: "True",
            explanation: "Triangles have three sides.",
          },
          {
            id: "q3",
            type: "SHORT_ANSWER",
            question: "Why can we use triangles for polygon angle sums?",
            correctAnswer: "A polygon can be split into triangles and each triangle has 180 degrees.",
            explanation: "Checks triangulation.",
          },
        ],
      },
      answers: {
        q1: "6",
        q2: "False",
        q3: "Because polygons can be divided into triangles.",
      },
      context: {
        className: "8",
        boardName: "CBSE",
        subjectName: "Mathematics",
        chapterName: "Geometry",
        topicName: "Polygons",
        topicDescription: "Interior angle sums",
      },
      provider,
    });

    expect(provider.evaluateTest).toHaveBeenCalledTimes(1);
    expect(provider.evaluateTest).toHaveBeenCalledWith(expect.objectContaining({
      subjectName: "Mathematics",
      chapterName: "Geometry",
      submittedAnswer: "Because polygons can be divided into triangles.",
    }));
    expect(result.evaluation.map((item) => item.scorePercentage)).toEqual([100, 0, 70]);
    expect(result.scorePercentage).toBe(57);
    expect(result.correctCount).toBe(1);
  });

});
