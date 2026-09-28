import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnlineTestAttemptStatus, OnlineTestPaperStatus, OnlineTestQuestionType } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  attemptFindUnique: vi.fn(),
  attemptUpdate: vi.fn(),
  transaction: vi.fn(),
  answerDeleteMany: vi.fn(),
  answerCreateMany: vi.fn(),
  answerUpdate: vi.fn(),
  transactionAttemptUpdate: vi.fn(),
  paperUpdate: vi.fn(),
  getAiConfig: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    onlineTestAttempt: {
      findUnique: mocks.attemptFindUnique,
      update: mocks.attemptUpdate,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/ai/config", () => ({
  getAiConfig: mocks.getAiConfig,
}));

vi.mock("@/lib/ai/gemini-provider", () => ({
  createAiLearningProvider: vi.fn(),
}));

vi.mock("@/features/ai/service", () => ({
  canUseAiFeatures: vi.fn(),
  getAiUsage: vi.fn(),
}));

import { evaluateOnlineTestAttempt, submitOnlineTestAttempt } from "@/features/test-papers/service";

const question = {
  id: "question_1",
  questionType: OnlineTestQuestionType.SHORT_ANSWER,
  questionText: "Explain why the angle sum is 180 degrees.",
  marks: 2,
  correctAnswerJson: "A triangle's angles total 180 degrees.",
  markingSchemeJson: [{ criterion: "Explains the angle sum", marks: 2 }],
  explanation: "A triangle's interior angles total 180 degrees.",
  chapter: { name: "Geometry" },
  topic: { name: "Triangles" },
};

function attemptFixture(status: OnlineTestAttemptStatus, withAnswers = false) {
  return {
    id: "attempt_1",
    testPaperId: "paper_1",
    status,
    percentage: null,
    answers: withAnswers ? [{ questionId: question.id, answerText: "They form a straight angle." }] : [],
    testPaper: {
      id: "paper_1",
      totalMarks: 2,
      child: {
        id: "child_1",
        userId: "parent_1",
        className: "Class 8",
        kidUser: { id: "kid_1" },
        curriculumAssignments: [],
      },
      subject: { name: "Mathematics" },
      sections: [{ questions: [question] }],
    },
  };
}

describe("online test submission grading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAiConfig.mockReturnValue({ evaluationReviewThreshold: 0.75 });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      onlineTestAnswer: {
        deleteMany: mocks.answerDeleteMany,
        createMany: mocks.answerCreateMany,
        update: mocks.answerUpdate,
      },
      onlineTestAttempt: { update: mocks.transactionAttemptUpdate },
      onlineTestPaper: { update: mocks.paperUpdate },
    }));
  });

  it("keeps submitted answers when AI grading is temporarily unavailable", async () => {
    mocks.attemptFindUnique
      .mockResolvedValueOnce(attemptFixture(OnlineTestAttemptStatus.IN_PROGRESS))
      .mockResolvedValueOnce(attemptFixture(OnlineTestAttemptStatus.SUBMITTED, true));
    const provider = {
      evaluateSubjectiveAnswer: vi.fn().mockRejectedValue(new Error("AI provider error: 503 - UNAVAILABLE")),
    };

    const result = await submitOnlineTestAttempt({
      userId: "kid_1",
      attemptId: "attempt_1",
      answers: { question_1: "They form a straight angle." },
      provider,
    });

    expect(mocks.answerCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ questionId: "question_1", answerText: "They form a straight angle." })],
    });
    expect(mocks.transactionAttemptUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: OnlineTestAttemptStatus.SUBMITTED }),
    }));
    expect(mocks.paperUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: OnlineTestPaperStatus.SUBMITTED },
    }));
    expect(mocks.attemptUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ overallFeedback: expect.stringContaining("temporarily unavailable") }),
    }));
    expect(result).toMatchObject({ paperId: "paper_1", gradingPending: true });
  });

  it("grades the already-saved answers when grading is retried", async () => {
    mocks.attemptFindUnique.mockResolvedValue(attemptFixture(OnlineTestAttemptStatus.SUBMITTED, true));
    const provider = {
      evaluateSubjectiveAnswer: vi.fn().mockResolvedValue({
        awardedMarks: 2,
        confidence: 0.95,
        feedback: "Correct explanation.",
      }),
    };

    const result = await evaluateOnlineTestAttempt({ userId: "kid_1", attemptId: "attempt_1", provider });

    expect(mocks.answerUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ aiAwardedMarks: 2, finalMarks: 2 }),
    }));
    expect(mocks.transactionAttemptUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: OnlineTestAttemptStatus.EVALUATED,
        percentage: 100,
      }),
    }));
    expect(result).toMatchObject({ percentage: 100, gradingPending: false });
  });
});
