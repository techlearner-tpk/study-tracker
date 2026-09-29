import "server-only";

import {
  AssignmentStatus,
  AiLearningMessageRole,
  AiLearningMode,
  AiSessionStatus,
  Prisma,
  SubscriptionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedAssignment, getOwnedTopic } from "@/lib/ownership";
import { getAiConfig } from "@/lib/ai/config";
import { createAiLearningProvider } from "@/lib/ai/gemini-provider";
import { buildGenerateTestPrompt, generateTestPromptVersion } from "@/lib/ai/prompts/generate-test";
import { buildTeachTopicPrompt, teachTopicPromptVersion } from "@/lib/ai/prompts/teach-topic";
import { aiGeneratedTestSchema, aiTeachMessageSchema, aiTeachResultSchema, aiTestSubmissionSchema } from "./schema";
import type { GeneratedTest, TeachTopicInput, TeachTopicResult } from "@/lib/ai/provider";
import { getCachedAiSettings, getCachedFamilySubscription } from "./admin-queries";
import { invalidateAiUsageCache } from "@/lib/cache-tags";

export type AiAccessState = {
  enabled: boolean;
  hasAccess: boolean;
  message: string;
  remainingUsage: number;
  limit: number;
  subscriptionStatus: SubscriptionStatus | "NONE";
};

type RuntimeAiSettings = {
  topicPromptLimit: number;
  testQuestionCount: number;
  maxUserPromptLength: number;
};

type TopicContext = TeachTopicInput & {
  childId: string;
  childName: string;
};

function premiumMessage(hasAccess: boolean, enabled: boolean) {
  if (!enabled) return "AI Learning is turned off.";
  if (!hasAccess) return "AI Learning is available with Premium.";
  return "";
}

async function resolveRuntimeAiSettings(): Promise<RuntimeAiSettings> {
  const env = getAiConfig();
  const settings = await getCachedAiSettings();
  return {
    topicPromptLimit: settings?.topicPromptLimit ?? env.topicPromptLimit,
    testQuestionCount: settings?.testQuestionCount ?? env.testQuestionCount,
    maxUserPromptLength: settings?.maxUserPromptLength ?? env.maxUserPromptLength,
  };
}

export async function canUseAiFeatures(parentId: string) {
  const config = getAiConfig();
  if (!config.enabled) return false;

  const subscription = await getCachedFamilySubscription(parentId);
  return subscriptionAllowsAi(subscription);
}

function subscriptionAllowsAi(subscription: Awaited<ReturnType<typeof getCachedFamilySubscription>>) {
  if (!subscription) return false;
  if (subscription.status !== SubscriptionStatus.TRIAL && subscription.status !== SubscriptionStatus.ACTIVE) return false;
  const now = new Date();
  if (subscription.startsAt && subscription.startsAt > now) return false;
  if (subscription.expiresAt && subscription.expiresAt <= now) return false;
  return true;
}

async function getUsageRow(client: Prisma.TransactionClient | typeof prisma, childId: string, topicId: string) {
  return client.aiTopicUsage.findUnique({
    where: { childId_topicId: { childId, topicId } },
  });
}

export async function getAiUsage(childId: string, topicId: string) {
  const settings = await resolveRuntimeAiSettings();
  const row = await getUsageRow(prisma, childId, topicId);
  const promptCount = row?.promptCount ?? 0;
  return {
    limit: settings.topicPromptLimit,
    promptCount,
    remaining: Math.max(0, settings.topicPromptLimit - promptCount),
  };
}

async function consumeAiUsageInTx(
  tx: Prisma.TransactionClient,
  childId: string,
  topicId: string,
  settings: RuntimeAiSettings,
) {
  await tx.aiTopicUsage.upsert({
    where: { childId_topicId: { childId, topicId } },
    create: { childId, topicId, promptCount: 0 },
    update: {},
  });

  const current = await getUsageRow(tx, childId, topicId);
  if (!current) {
    throw new Error("Unable to load AI usage");
  }
  if (current.promptCount >= settings.topicPromptLimit) {
    throw new Error("You have used all AI interactions available for this topic.");
  }

  return tx.aiTopicUsage.update({
    where: { childId_topicId: { childId, topicId } },
    data: { promptCount: { increment: 1 } },
  });
}

export async function consumeAiUsage(childId: string, topicId: string) {
  const settings = await resolveRuntimeAiSettings();
  return prisma.$transaction(async (tx) => consumeAiUsageInTx(tx, childId, topicId, settings), {
    timeout: 15000,
  });
}

export async function resetAiUsage(childId: string, topicId: string) {
  return prisma.aiTopicUsage.deleteMany({
    where: { childId, topicId },
  });
}

function topicContext(topic: Awaited<ReturnType<typeof getOwnedTopic>>): TopicContext {
  const child = topic.chapter.subject.child;
  const boardName = child.curriculumAssignments[0]?.curriculumVersion.board.name ?? null;
  return {
    childId: child.id,
    childName: child.name,
    className: child.className,
    boardName,
    subjectName: topic.chapter.subject.name,
    chapterName: topic.chapter.name,
    topicName: topic.name,
    topicDescription: topic.description ?? null,
  };
}

function teachPromptPayload(input: TeachTopicInput) {
  return buildTeachTopicPrompt(input);
}

function testPromptPayload(input: TeachTopicInput, questionCount: number) {
  return buildGenerateTestPrompt({ ...input, questionCount });
}

type TestQuestion = GeneratedTest["questions"][number];

type TestQuestionEvaluation = {
  questionId: string;
  questionType: TestQuestion["type"];
  submittedAnswer: string;
  correctAnswer: string;
  scorePercentage: number;
  isCorrect: boolean;
  explanation: string;
};

function normalizeSubmittedAnswer(answer: string) {
  return answer.trim().replace(/\s+/g, " ").toLowerCase();
}

function objectiveQuestionEvaluation(question: TestQuestion, submittedAnswer: string): TestQuestionEvaluation {
  const isCorrect = normalizeSubmittedAnswer(submittedAnswer) === normalizeSubmittedAnswer(question.correctAnswer);
  return {
    questionId: question.id,
    questionType: question.type,
    submittedAnswer,
    correctAnswer: question.correctAnswer,
    scorePercentage: isCorrect ? 100 : 0,
    isCorrect,
    explanation: isCorrect ? "Correct. " + question.explanation : question.explanation,
  };
}

export async function evaluateSubmittedTestAnswers({
  test,
  answers,
  context,
  provider = createAiLearningProvider(),
}: {
  test: GeneratedTest;
  answers: Record<string, string>;
  context: TeachTopicInput;
  provider?: Pick<ReturnType<typeof createAiLearningProvider>, "evaluateTest">;
}) {
  const evaluation = await Promise.all(
    test.questions.map(async (question): Promise<TestQuestionEvaluation> => {
      const submittedAnswer = answers[question.id] ?? "";
      if (question.type !== "SHORT_ANSWER") {
        return objectiveQuestionEvaluation(question, submittedAnswer);
      }
      if (!submittedAnswer.trim()) {
        return {
          questionId: question.id,
          questionType: question.type,
          submittedAnswer,
          correctAnswer: question.correctAnswer,
          scorePercentage: 0,
          isCorrect: false,
          explanation: `No answer was submitted. A strong answer should include: ${question.correctAnswer}`,
        };
      }

      const aiEvaluation = await provider.evaluateTest({
        className: context.className,
        boardName: context.boardName,
        subjectName: context.subjectName,
        chapterName: context.chapterName,
        topicName: context.topicName,
        topicDescription: context.topicDescription,
        questionType: question.type,
        question: question.question,
        expectedAnswer: question.correctAnswer,
        questionExplanation: question.explanation,
        submittedAnswer,
      });

      return {
        questionId: question.id,
        questionType: question.type,
        submittedAnswer,
        correctAnswer: question.correctAnswer,
        scorePercentage: aiEvaluation.scorePercentage,
        isCorrect: aiEvaluation.isCorrect,
        explanation: aiEvaluation.explanation,
      };
    }),
  );

  const scorePercentage = test.questions.length
    ? Math.round(evaluation.reduce((total, item) => total + item.scorePercentage, 0) / test.questions.length)
    : 0;
  const correctCount = evaluation.filter((item) => item.scorePercentage === 100).length;
  return { evaluation, scorePercentage, correctCount };
}

async function createRequestLog(requestId: string, operation: string, sessionId?: string | null) {
  try {
    await prisma.aiRequestLog.create({
      data: {
        requestId,
        operation,
        sessionId: sessionId ?? null,
        status: "PENDING",
      },
    });
    return true;
  } catch {
    return false;
  }
}

async function finishRequestLog(requestId: string, status: string, sessionId?: string | null) {
  try {
    await prisma.aiRequestLog.update({
      where: { requestId },
      data: {
        status,
        ...(sessionId !== undefined ? { sessionId } : {}),
      },
    });
  } catch {
    // Best effort only.
  }
}

async function withRequestLog<T extends { sessionId?: string }>(requestId: string, operation: string, work: () => Promise<T>) {
  const created = await createRequestLog(requestId, operation);
  if (!created) {
    throw new Error("Duplicate AI request");
  }

  try {
    const result = await work();
    await finishRequestLog(requestId, "COMPLETED", result.sessionId ?? null);
    return result;
  } catch (error) {
    await finishRequestLog(requestId, "FAILED");
    throw error;
  }
}

async function getTopicAccessState(
  userId: string,
  topicId: string,
  ownedTopic?: Awaited<ReturnType<typeof getOwnedTopic>>,
): Promise<AiAccessState & { topic: Awaited<ReturnType<typeof getOwnedTopic>> }> {
  const topic = ownedTopic ?? await getOwnedTopic(userId, topicId);
  const parentId = topic.chapter.subject.child.userId;
  const config = getAiConfig();

  if (!config.enabled || !parentId) {
    return {
      enabled: config.enabled,
      hasAccess: false,
      message: premiumMessage(false, config.enabled),
      remainingUsage: 0,
      limit: config.topicPromptLimit,
      subscriptionStatus: "NONE",
      topic,
    };
  }

  const [subscription, usage] = await Promise.all([
    getCachedFamilySubscription(parentId),
    getAiUsage(topic.chapter.subject.child.id, topic.id),
  ]);
  const hasAccess = subscriptionAllowsAi(subscription);

  return {
    enabled: config.enabled,
    hasAccess,
    message: premiumMessage(hasAccess, config.enabled),
    remainingUsage: usage.remaining,
    limit: usage.limit,
    subscriptionStatus: subscription?.status ?? "NONE",
    topic,
  };
}

export async function getTopicAiAccessState(
  userId: string,
  topicId: string,
  ownedTopic?: Awaited<ReturnType<typeof getOwnedTopic>>,
) {
  return getTopicAccessState(userId, topicId, ownedTopic);
}

export async function getAssignmentAiAccessState(
  userId: string,
  assignmentId: string,
  ownedAssignment?: Awaited<ReturnType<typeof getOwnedAssignment>>,
) {
  const assignment = ownedAssignment ?? await getOwnedAssignment(userId, assignmentId);
  const access = await getTopicAccessState(userId, assignment.topicId);
  return { ...access, assignment };
}

export async function startTeachSession(userId: string, topicId: string, assignmentId?: string) {
  const access = await getTopicAccessState(userId, topicId);
  if (!access.hasAccess) {
    throw new Error(access.message || "AI Learning is available with Premium.");
  }

  if (assignmentId) {
    const assignment = await getOwnedAssignment(userId, assignmentId);
    if (assignment.topicId !== topicId) {
      throw new Error("Assignment topic mismatch");
    }
  }

  const existing = await prisma.aiLearningSession.findFirst({
    where: {
      childId: access.topic.chapter.subject.child.id,
      topicId,
      assignmentId: assignmentId ?? null,
      mode: AiLearningMode.TEACH,
      status: AiSessionStatus.ACTIVE,
    },
    include: { messages: { orderBy: { sequence: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  if (existing && existing.promptVersion === teachTopicPromptVersion) {
    return {
      ...access,
      session: existing,
      messages: existing.messages,
      isNew: false,
      initialLesson: null as TeachTopicResult | null,
      sessionId: existing.id,
    };
  }

  const provider = createAiLearningProvider();
  const requestId = crypto.randomUUID();
  return withRequestLog(requestId, "TEACH_START", async () => {
    const teachInput = topicContext(access.topic);
    const teachPrompt = teachPromptPayload(teachInput);
    const lesson = aiTeachResultSchema.parse(await provider.teachTopic(teachInput));
    const providerInfo = provider.getLastProviderInfo?.() ?? { provider: getAiConfig().provider, model: getAiConfig().model };
    const settings = await resolveRuntimeAiSettings();

    const session = await prisma.$transaction(async (tx) => {
      await consumeAiUsageInTx(tx, access.topic.chapter.subject.child.id, topicId, settings);
      return tx.aiLearningSession.create({
        data: {
          childId: access.topic.chapter.subject.child.id,
          topicId,
          assignmentId: assignmentId ?? null,
          mode: AiLearningMode.TEACH,
          status: AiSessionStatus.ACTIVE,
          provider: providerInfo.provider,
          model: providerInfo.model,
          promptVersion: teachTopicPromptVersion,
          messages: {
            create: [
              {
                role: AiLearningMessageRole.SYSTEM,
                content: JSON.stringify({
                  promptVersion: teachTopicPromptVersion,
                  systemPrompt: teachPrompt.system,
                  userPrompt: teachPrompt.user,
                }),
                sequence: 1,
              },
              {
                role: AiLearningMessageRole.ASSISTANT,
                content: JSON.stringify(lesson),
                sequence: 2,
              },
            ],
          },
        },
        include: { messages: { orderBy: { sequence: "asc" } } },
      });
    }, { timeout: 15000 });
    if (access.topic.chapter.subject.child.userId) {
      invalidateAiUsageCache(access.topic.chapter.subject.child.userId);
    }

    return {
      ...access,
      session,
      messages: session.messages,
      isNew: true,
      initialLesson: lesson,
      sessionId: session.id,
    };
  });
}

export async function sendTeachMessage(formData: FormData) {
  const data = aiTeachMessageSchema.parse(Object.fromEntries(formData.entries()));
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Not authenticated");

  const session = await prisma.aiLearningSession.findUnique({
    where: { id: data.sessionId },
    include: {
      messages: { orderBy: { sequence: "asc" } },
      topic: { include: { chapter: { include: { subject: { include: { child: { include: { kidUser: true } } } } } } } },
    },
  });
  if (!session) throw new Error("Session not found");

  const access = await getTopicAccessState(currentUser.id, session.topicId);
  if (!access.hasAccess) {
    throw new Error(access.message || "AI Learning is available with Premium.");
  }
  if (data.message.length > getAiConfig().maxUserPromptLength) {
    throw new Error(`Keep your question under ${getAiConfig().maxUserPromptLength} characters.`);
  }

  const provider = createAiLearningProvider();
  const requestId = crypto.randomUUID();
  return withRequestLog(requestId, "TEACH_MESSAGE", async () => {
    const teachInput = {
      ...topicContext(access.topic),
      topicDescription: [access.topic.description, `Child question: ${data.message}`].filter(Boolean).join("\n"),
    };
    const followUpLesson = aiTeachResultSchema.parse(await provider.teachTopic(teachInput));
    const settings = await resolveRuntimeAiSettings();

    await prisma.$transaction(async (tx) => {
      await consumeAiUsageInTx(tx, access.topic.chapter.subject.child.id, session.topicId, settings);
      const nextSequence = (await tx.aiLearningMessage.count({ where: { sessionId: session.id } })) + 1;
      await tx.aiLearningMessage.createMany({
        data: [
          {
            sessionId: session.id,
            role: AiLearningMessageRole.CHILD,
            content: data.message,
            sequence: nextSequence,
          },
          {
            sessionId: session.id,
            role: AiLearningMessageRole.ASSISTANT,
            content: JSON.stringify(followUpLesson),
            sequence: nextSequence + 1,
          },
        ],
      });
    }, { timeout: 15000 });
    if (access.topic.chapter.subject.child.userId) {
      invalidateAiUsageCache(access.topic.chapter.subject.child.userId);
    }

    return { sessionId: session.id };
  });
}

export async function generateTopicTest(userId: string, topicId: string, assignmentId?: string) {
  const access = await getTopicAccessState(userId, topicId);
  if (!access.hasAccess) {
    throw new Error(access.message || "AI Learning is available with Premium.");
  }

  if (assignmentId) {
    const assignment = await getOwnedAssignment(userId, assignmentId);
    if (assignment.topicId !== topicId) {
      throw new Error("Assignment topic mismatch");
    }
  }

  const existing = await prisma.aiLearningSession.findFirst({
    where: {
      childId: access.topic.chapter.subject.child.id,
      topicId,
      assignmentId: assignmentId ?? null,
      mode: AiLearningMode.TEST,
      status: AiSessionStatus.ACTIVE,
    },
    include: { testAttempt: true },
    orderBy: { updatedAt: "desc" },
  });
  if (existing?.testAttempt && existing.promptVersion === generateTestPromptVersion) {
    return {
      ...access,
      session: existing,
      attempt: existing.testAttempt,
      isNew: false,
      generatedTest: aiGeneratedTestSchema.parse(existing.testAttempt.questionsJson),
      sessionId: existing.id,
    };
  }

  const settings = await resolveRuntimeAiSettings();
  const provider = createAiLearningProvider();
  const requestId = crypto.randomUUID();
  return withRequestLog(requestId, "TEST_GENERATE", async () => {
    const testInput = {
      ...topicContext(access.topic),
      questionCount: settings.testQuestionCount,
    };
    const testPrompt = testPromptPayload(testInput, settings.testQuestionCount);
    const test = aiGeneratedTestSchema.parse(await provider.generateTest(testInput));
    const providerInfo = provider.getLastProviderInfo?.() ?? { provider: getAiConfig().provider, model: getAiConfig().model };

    const session = await prisma.$transaction(async (tx) => {
      await consumeAiUsageInTx(tx, access.topic.chapter.subject.child.id, topicId, settings);
      return tx.aiLearningSession.create({
        data: {
          childId: access.topic.chapter.subject.child.id,
          topicId,
          assignmentId: assignmentId ?? null,
          mode: AiLearningMode.TEST,
          status: AiSessionStatus.ACTIVE,
          provider: providerInfo.provider,
          model: providerInfo.model,
          promptVersion: generateTestPromptVersion,
          messages: {
            create: [
              {
                role: AiLearningMessageRole.SYSTEM,
                content: JSON.stringify({
                  promptVersion: generateTestPromptVersion,
                  systemPrompt: testPrompt.system,
                  userPrompt: testPrompt.user,
                }),
                sequence: 1,
              },
            ],
          },
          testAttempt: {
            create: {
              childId: access.topic.chapter.subject.child.id,
              topicId,
              assignmentId: assignmentId ?? null,
              questionCount: test.questions.length,
              correctCount: 0,
              scorePercentage: 0,
              startedAt: new Date(),
              questionsJson: test,
            },
          },
        },
        include: { testAttempt: true },
      });
    }, { timeout: 15000 });
    if (access.topic.chapter.subject.child.userId) {
      invalidateAiUsageCache(access.topic.chapter.subject.child.userId);
    }

    return {
      ...access,
      session,
      attempt: session.testAttempt,
      isNew: true,
      generatedTest: test,
      sessionId: session.id,
    };
  });
}

export async function submitTopicTest(formData: FormData) {
  const data = aiTestSubmissionSchema.parse(Object.fromEntries(formData.entries()));
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Not authenticated");

  const attempt = await prisma.aiTestAttempt.findUnique({
    where: { id: data.attemptId },
    include: {
      session: true,
      topic: {
        include: {
          chapter: {
            include: {
              subject: {
                include: {
                  child: {
                    include: {
                      kidUser: true,
                      curriculumAssignments: {
                        include: {
                          curriculumVersion: {
                            include: {
                              board: true,
                            },
                          },
                          curriculumClass: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      assignment: true,
    },
  });
  if (!attempt) throw new Error("Test attempt not found");

  const access = await getTopicAccessState(currentUser.id, attempt.topicId);
  if (!access.hasAccess) {
    throw new Error(access.message || "AI Learning is available with Premium.");
  }

  const test = aiGeneratedTestSchema.parse(attempt.questionsJson);
  const answers: Record<string, string> = {};
  for (const question of test.questions) {
    answers[question.id] = String(formData.get(`answer_${question.id}`) ?? "").trim();
  }

  const child = attempt.topic.chapter.subject.child;
  const boardName = child.curriculumAssignments[0]?.curriculumVersion.board.name ?? null;
  const { evaluation, scorePercentage, correctCount } = await evaluateSubmittedTestAnswers({
    test,
    answers,
    context: {
      className: child.className,
      boardName,
      subjectName: attempt.topic.chapter.subject.name,
      chapterName: attempt.topic.chapter.name,
      topicName: attempt.topic.name,
      topicDescription: attempt.topic.description ?? null,
    },
  });

  await prisma.aiTestAttempt.update({
    where: { id: attempt.id },
    data: {
      correctCount,
      scorePercentage,
      submittedAt: new Date(),
      answersJson: answers,
      evaluationJson: evaluation,
    },
  });
  await prisma.aiLearningSession.update({
    where: { id: attempt.sessionId },
    data: { status: AiSessionStatus.COMPLETED },
  });

  if (attempt.assignmentId) {
    await prisma.assignment.update({
      where: { id: attempt.assignmentId },
      data: {
        score: correctCount,
        status: AssignmentStatus.IN_PROGRESS,
        isActive: true,
      },
    });
  }

  return { attemptId: attempt.id, sessionId: attempt.sessionId, scorePercentage, correctCount };
}

export async function getTopicAiUsage(childId: string, topicId: string) {
  return getAiUsage(childId, topicId);
}

export async function getAiSession(sessionId: string) {
  return prisma.aiLearningSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { sequence: "asc" } },
      testAttempt: true,
      topic: {
        include: {
          chapter: {
            include: {
              subject: {
                include: {
                  child: {
                    include: {
                      kidUser: true,
                      curriculumAssignments: {
                        include: {
                          curriculumVersion: {
                            include: {
                              board: true,
                            },
                          },
                          curriculumClass: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      assignment: true,
      child: true,
    },
  });
}

export async function getTopicAiHistory(userId: string, topicId: string) {
  const topic = await getOwnedTopic(userId, topicId);
  const sessions = await prisma.aiLearningSession.findMany({
    where: { topicId },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { sequence: "asc" } },
      testAttempt: true,
      assignment: true,
      child: {
        include: {
          kidUser: true,
        },
      },
    },
  });

  return { topic, sessions };
}
