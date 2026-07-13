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
import { generateTestPromptVersion } from "@/lib/ai/prompts/generate-test";
import { teachTopicPromptVersion } from "@/lib/ai/prompts/teach-topic";
import { aiGeneratedTestSchema, aiTeachMessageSchema, aiTeachResultSchema, aiTestSubmissionSchema } from "./schema";
import type { TeachTopicInput, TeachTopicResult } from "@/lib/ai/provider";

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

async function resolveFamilyParentId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, childId: true },
  });
  if (!user) return null;
  if (user.role === "PARENT") return user.id;
  if (!user.childId) return null;
  const child = await prisma.child.findUnique({
    where: { id: user.childId },
    select: { userId: true },
  });
  return child?.userId ?? null;
}

async function resolveRuntimeAiSettings(): Promise<RuntimeAiSettings> {
  const env = getAiConfig();
  const settings = await prisma.aiSetting.findUnique({ where: { id: 1 } });
  return {
    topicPromptLimit: settings?.topicPromptLimit ?? env.topicPromptLimit,
    testQuestionCount: settings?.testQuestionCount ?? env.testQuestionCount,
    maxUserPromptLength: settings?.maxUserPromptLength ?? env.maxUserPromptLength,
  };
}

export async function canUseAiFeatures(parentId: string) {
  const config = getAiConfig();
  if (!config.enabled) return false;

  const subscription = await prisma.subscription.findUnique({
    where: { parentId },
    select: { status: true, startsAt: true, expiresAt: true },
  });
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

async function consumeAiUsageInTx(tx: Prisma.TransactionClient, childId: string, topicId: string) {
  const settings = await resolveRuntimeAiSettings();
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
  return prisma.$transaction(async (tx) => consumeAiUsageInTx(tx, childId, topicId));
}

export async function resetAiUsage(childId: string, topicId: string) {
  return prisma.aiTopicUsage.deleteMany({
    where: { childId, topicId },
  });
}

function topicContext(topic: Awaited<ReturnType<typeof getOwnedTopic>>): TopicContext {
  const child = topic.chapter.subject.child;
  return {
    childId: child.id,
    childName: child.name,
    className: child.className,
    subjectName: topic.chapter.subject.name,
    chapterName: topic.chapter.name,
    topicName: topic.name,
    topicDescription: topic.description ?? null,
  };
}

function fallbackTeachLesson(input: TeachTopicInput): TeachTopicResult {
  return {
    title: `Learning ${input.topicName}`,
    sections: [
      {
        heading: "What this means",
        body: input.topicDescription?.trim() || `This topic is part of ${input.subjectName} for ${input.className}.`,
      },
      {
        heading: "Simple example",
        body: `Think of one real-life example from ${input.topicName.toLowerCase()}.`,
      },
      {
        heading: "Try this",
        body: "Say the idea back in your own words, then add one example.",
      },
      {
        heading: "Check your understanding",
        body: "What is the main idea you should remember from this topic?",
      },
    ],
    suggestedActions: [
      "Explain more simply",
      "Give another example",
      "Ask me a question",
      "I did not understand",
    ],
    checkQuestion: `Can you explain ${input.topicName} in one sentence?`,
  };
}

function fallbackGeneratedTest(input: TeachTopicInput, questionCount: number) {
  return {
    title: `${input.topicName} practice test`,
    questions: Array.from({ length: questionCount }, (_, index) => {
      const number = index + 1;
      return {
        id: `q${number}`,
        type: number % 2 === 0 ? ("TRUE_FALSE" as const) : ("SHORT_ANSWER" as const),
        question: `Question ${number}: What is one key fact about ${input.topicName}?`,
        options: number % 2 === 0 ? ["True", "False"] : undefined,
        correctAnswer: number % 2 === 0 ? "True" : "Sample answer",
        explanation: `This checks understanding of ${input.topicName}.`,
      };
    }),
  };
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

async function getTopicAccessState(userId: string, topicId: string): Promise<AiAccessState & { topic: Awaited<ReturnType<typeof getOwnedTopic>> }> {
  const topic = await getOwnedTopic(userId, topicId);
  const parentId = await resolveFamilyParentId(userId);
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

  const subscription = await prisma.subscription.findUnique({
    where: { parentId },
    select: { status: true },
  });
  const hasAccess = await canUseAiFeatures(parentId);
  const usage = await getAiUsage(topic.chapter.subject.child.id, topic.id);

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

export async function getTopicAiAccessState(userId: string, topicId: string) {
  return getTopicAccessState(userId, topicId);
}

export async function getAssignmentAiAccessState(userId: string, assignmentId: string) {
  const assignment = await getOwnedAssignment(userId, assignmentId);
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
  if (existing) {
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
    let lesson: TeachTopicResult;
    try {
      lesson = aiTeachResultSchema.parse(await provider.teachTopic(teachInput));
    } catch {
      lesson = fallbackTeachLesson(teachInput);
    }

    const session = await prisma.$transaction(async (tx) => {
      await consumeAiUsageInTx(tx, access.topic.chapter.subject.child.id, topicId);
      return tx.aiLearningSession.create({
        data: {
          childId: access.topic.chapter.subject.child.id,
          topicId,
          assignmentId: assignmentId ?? null,
          mode: AiLearningMode.TEACH,
          status: AiSessionStatus.ACTIVE,
          provider: getAiConfig().provider,
          model: getAiConfig().model,
          promptVersion: teachTopicPromptVersion,
          messages: {
            create: [
              {
                role: AiLearningMessageRole.SYSTEM,
                content: JSON.stringify({ promptVersion: teachTopicPromptVersion, className: access.topic.chapter.subject.child.className }),
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
    });

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
    let followUpLesson: TeachTopicResult;
    try {
      followUpLesson = aiTeachResultSchema.parse(await provider.teachTopic(teachInput));
    } catch {
      followUpLesson = fallbackTeachLesson(teachInput);
    }

    await prisma.$transaction(async (tx) => {
      await consumeAiUsageInTx(tx, access.topic.chapter.subject.child.id, session.topicId);
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
    });

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
  if (existing?.testAttempt) {
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
    let test;
    try {
      test = aiGeneratedTestSchema.parse(await provider.generateTest(testInput));
    } catch {
      test = fallbackGeneratedTest(testInput, settings.testQuestionCount);
    }

    const session = await prisma.$transaction(async (tx) => {
      await consumeAiUsageInTx(tx, access.topic.chapter.subject.child.id, topicId);
      return tx.aiLearningSession.create({
        data: {
          childId: access.topic.chapter.subject.child.id,
          topicId,
          assignmentId: assignmentId ?? null,
          mode: AiLearningMode.TEST,
          status: AiSessionStatus.ACTIVE,
          provider: getAiConfig().provider,
          model: getAiConfig().model,
          promptVersion: generateTestPromptVersion,
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
    });

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
      topic: { include: { chapter: { include: { subject: { include: { child: { include: { kidUser: true } } } } } } } },
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

  let correctCount = 0;
  const evaluation = test.questions.map((question) => {
    const submittedAnswer = answers[question.id] ?? "";
    const normalized = submittedAnswer.trim().toLowerCase();
    const expected = question.correctAnswer.trim().toLowerCase();
    const isCorrect = normalized === expected;
    if (isCorrect) correctCount += 1;
    return {
      questionId: question.id,
      submittedAnswer,
      isCorrect,
      explanation: question.explanation,
    };
  });

  const scorePercentage = test.questions.length ? Math.round((correctCount / test.questions.length) * 100) : 0;
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
      topic: { include: { chapter: { include: { subject: { include: { child: { include: { kidUser: true } } } } } } } },
      assignment: true,
      child: true,
    },
  });
}
