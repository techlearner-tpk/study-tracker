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
  return prisma.$transaction(async (tx) => consumeAiUsageInTx(tx, childId, topicId), {
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

function isMathTopicName(topicName: string) {
  const lower = topicName.toLowerCase();
  return lower.includes("integer") || lower.includes("number") || lower.includes("fraction") || lower.includes("decimal") || lower.includes("equation") || lower.includes("operation");
}

function isReadingTopicName(topicName: string) {
  const lower = topicName.toLowerCase();
  return lower.includes("passage") || lower.includes("reading") || lower.includes("comprehension");
}

function fallbackTeachLesson(input: TeachTopicInput): TeachTopicResult {
  const isMathTopic = isMathTopicName(input.topicName);
  const isReadingTopic = isReadingTopicName(input.topicName);

  let explanation = input.topicDescription?.trim() || `This topic is part of ${input.subjectName} for ${input.className}.`;
  let example = `Example: use the topic in one specific way from the lesson.`;
  let mistake = `A common mistake is to treat ${input.topicName.toLowerCase()} as a generic idea instead of the exact topic in this chapter.`;
  let practice = `Try one question from ${input.topicName.toLowerCase()} and explain your answer.`;
  let learningGoal = `The student will understand ${input.topicName.toLowerCase()} and use it in a simple question.`;
  let prerequisite = `The student should already know the basic ideas from ${input.chapterName.toLowerCase()}.`;
  let checkQuestion = {
    question: `What is the key idea of ${input.topicName.toLowerCase()}?`,
    expectedAnswer: `An explanation of ${input.topicName.toLowerCase()} using the lesson.`,
    hint: `Look at the concept and the worked example.`,
  };

  if (isMathTopic) {
    explanation = `This topic teaches how to work with numbers in a clear step-by-step way. It shows you how to use rules, signs, and operations without getting confused. If you read the steps carefully, you can work out the answer one part at a time.`;
    example = `Example: if you add -3 and 5, the answer is 2 because 5 has 3 more than -3.`;
    mistake = `A common mistake is to ignore the sign and treat -3 + 5 like 3 + 5. That changes the answer completely.`;
    practice = `Try solving -4 + 7 and explain why the answer is positive.`;
    learningGoal = `The student will understand how to apply the rules for operations on integers in a simple calculation.`;
    prerequisite = `The student should know the difference between positive and negative numbers.`;
    checkQuestion = {
      question: `What happens when you add 5 to -3?`,
      expectedAnswer: `The answer is 2.`,
      hint: `Think about moving 5 steps right from -3 on a number line.`,
    };
  } else if (isReadingTopic) {
    explanation = `A ${input.topicName.toLowerCase()} is a piece of reading that can tell a story, explain an idea, or give information. When you read it, you look for the main idea, important details, and the message the writer wants to share. It is a way to practice understanding text carefully instead of just reading the words quickly.`;
    example = `Example: a passage about school rules may explain why we line up quietly and how it helps everyone.`;
    mistake = `A common mistake is to copy one sentence without understanding the main idea of the passage.`;
    practice = `Read one sentence and say what it is mainly about in your own words.`;
    learningGoal = `The student will understand what a ${input.topicName.toLowerCase()} means and answer a question about its main idea.`;
    prerequisite = `The student should be able to read a short sentence or paragraph.`;
    checkQuestion = {
      question: `What is the main idea of a ${input.topicName.toLowerCase()}?`,
      expectedAnswer: `The central message or idea of the passage.`,
      hint: `Think about what the whole text is mostly about.`,
    };
  } else if (input.topicDescription?.trim()) {
    explanation = input.topicDescription.trim();
  }

  return {
    title: `A short lesson on ${input.topicName}`,
    learningGoal,
    prerequisite,
    explanation,
    example,
    mistake,
    practice,
    suggestedActions: [
      "Explain more simply",
      "Show another worked example",
      "Ask me one question at a time",
      "Explain my mistake",
    ],
    checkQuestion,
  };
}

function fallbackGeneratedTest(input: TeachTopicInput, questionCount: number) {
  const isMathTopic = isMathTopicName(input.topicName);
  const isReadingTopic = isReadingTopicName(input.topicName);
  const topicLower = input.topicName.toLowerCase();
  const mathTemplates = [
    {
      type: "SHORT_ANSWER" as const,
      question: `What does ${input.topicName.toLowerCase()} mean in your own words?`,
      correctAnswer: `Working with numbers in ${input.topicName.toLowerCase()}.`,
      explanation: `This checks the basic meaning of ${input.topicName.toLowerCase()}.`,
    },
    {
      type: "MULTIPLE_CHOICE" as const,
      question: `What is the answer to -3 + 5?`,
      options: ["2", "-8", "-2", "8"],
      correctAnswer: "2",
      explanation: "Adding 5 to -3 moves 5 steps to the right on the number line, giving 2.",
    },
    {
      type: "TRUE_FALSE" as const,
      question: `True or false: adding a negative number makes the result smaller.`,
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "Adding a negative number moves the result left on the number line.",
    },
    {
      type: "SHORT_ANSWER" as const,
      question: `Explain what happens when you subtract a negative number.`,
      correctAnswer: "It becomes addition.",
      explanation: "Subtracting a negative is the same as adding the positive version.",
    },
    {
      type: "MULTIPLE_CHOICE" as const,
      question: `Which number is greater: -2 or -6?`,
      options: ["-2", "-6", "Both are equal", "Cannot tell"],
      correctAnswer: "-2",
      explanation: "On a number line, -2 is to the right of -6, so it is greater.",
    },
  ];
  const readingTemplates = [
    {
      type: "SHORT_ANSWER" as const,
      question: `What is the main idea of a ${topicLower}?`,
      correctAnswer: `The central message or idea of the ${topicLower}.`,
      explanation: `This checks whether the child understands the overall idea, not just one word.`,
    },
    {
      type: "TRUE_FALSE" as const,
      question: `True or false: a reading passage can include both facts and opinions.`,
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "Many reading passages mix facts, examples, and the writer's point of view.",
    },
    {
      type: "MULTIPLE_CHOICE" as const,
      question: `Which detail best helps you understand the topic?`,
      options: ["A random sentence", "A key example", "A page number only", "A title only"],
      correctAnswer: "A key example",
      explanation: "Examples help show the meaning of the topic more clearly.",
    },
    {
      type: "SHORT_ANSWER" as const,
      question: `Give one detail that supports the main idea of the passage.`,
      correctAnswer: "A detail from the passage.",
      explanation: "Good readers support the main idea with evidence from the text.",
    },
    {
      type: "MULTIPLE_CHOICE" as const,
      question: `What should you do first when you read a passage?`,
      options: ["Look for the main idea", "Ignore the title", "Guess randomly", "Skip the details"],
      correctAnswer: "Look for the main idea",
      explanation: "Finding the main idea helps you understand the passage as a whole.",
    },
  ];
  const genericTemplates = [
    {
      type: "SHORT_ANSWER" as const,
      question: `Explain ${input.topicName.toLowerCase()} in one clear sentence.`,
      correctAnswer: `${input.topicName} is the idea or skill being studied in this lesson.`,
      explanation: `This checks the core meaning of the topic.`,
    },
    {
      type: "MULTIPLE_CHOICE" as const,
      question: `Which example best matches ${input.topicName.toLowerCase()}?`,
      options: ["A correct example", "A random unrelated thing", "A wrong topic", "None of these"],
      correctAnswer: "A correct example",
      explanation: "A topic-specific example shows understanding.",
    },
    {
      type: "TRUE_FALSE" as const,
      question: `True or false: you should use the idea from ${input.topicName.toLowerCase()} when solving a related problem.`,
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "The lesson should help the child apply the topic in practice.",
    },
    {
      type: "SHORT_ANSWER" as const,
      question: `What is one way ${input.topicName.toLowerCase()} is used in real work or daily life?`,
      correctAnswer: "A real-life use of the topic.",
      explanation: "Application questions make the test feel more like a challenge.",
    },
    {
      type: "MULTIPLE_CHOICE" as const,
      question: `Which statement is most likely correct for ${input.topicName.toLowerCase()}?`,
      options: ["The one that fits the topic", "Any random answer", "A completely unrelated idea", "No answer"],
      correctAnswer: "The one that fits the topic",
      explanation: "The child should connect the topic to the correct statement.",
    },
  ];
  const templates = isMathTopic ? mathTemplates : isReadingTopic ? readingTemplates : genericTemplates;

  return {
    title: `${input.topicName} practice test`,
    questions: Array.from({ length: questionCount }, (_, index) => {
      const number = index + 1;
      const template = templates[(number - 1) % templates.length];
      return {
        id: `q${number}`,
        type: template.type,
        question: `${number}. ${template.question}`,
        options: template.options,
        correctAnswer: template.correctAnswer,
        explanation: template.explanation,
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
    const teachPrompt = teachPromptPayload(teachInput);
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
    }, { timeout: 15000 });

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
    const testPrompt = testPromptPayload(testInput, settings.testQuestionCount);
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
