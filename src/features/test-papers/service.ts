import "server-only";

import {
  AiQuotaReservationStatus,
  OnlineTestAiReviewStatus,
  OnlineTestAttemptStatus,
  OnlineTestDifficulty,
  OnlineTestPaperSource,
  OnlineTestPaperStatus,
  OnlineTestQuestionType,
  Prisma,
  SubscriptionStatus,
  TestTemplateStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiConfig } from "@/lib/ai/config";
import { createAiLearningProvider } from "@/lib/ai/gemini-provider";
import { canUseAiFeatures, getAiUsage } from "@/features/ai/service";
import type {
  AiLearningProvider,
  GeneratedTestPaperSection,
  TestPaperQuestionSlot,
} from "@/lib/ai/provider";
import {
  allowedQuestionTypesForSubject,
  isSupportedTestPaperSubject,
  supportedTestPaperSubjects,
  validateTemplateTotals,
} from "./rules";

export { allowedQuestionTypesForSubject, isSupportedTestPaperSubject, supportedTestPaperSubjects, validateTemplateTotals };

const subjectiveTypes = new Set<OnlineTestQuestionType>([
  OnlineTestQuestionType.VERY_SHORT_ANSWER,
  OnlineTestQuestionType.SHORT_ANSWER,
  OnlineTestQuestionType.LONG_ANSWER,
  OnlineTestQuestionType.CASE_BASED,
  OnlineTestQuestionType.ASSERTION_REASON,
  OnlineTestQuestionType.READING_COMPREHENSION,
  OnlineTestQuestionType.WRITING,
]);

export type OnlineTestPaperTree = Prisma.OnlineTestPaperGetPayload<{
  include: {
    child: true;
    subject: true;
    template: true;
    topics: { include: { topic: true; chapter: true } };
    sections: { include: { questions: { include: { topic: true; chapter: true }; orderBy: { order: "asc" } } }; orderBy: { order: "asc" } };
    attempts: { include: { answers: { include: { question: true } } }; orderBy: { createdAt: "desc" } };
  };
}>;

type SubjectWithTree = Prisma.SubjectGetPayload<{
  include: {
    child: {
      include: {
        kidUser: true;
        curriculumAssignments: { include: { curriculumVersion: { include: { board: true } }; curriculumClass: true } };
      };
    };
    chapters: { include: { topics: true } };
  };
}>;

async function resolveParentIdForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, childId: true },
  });
  if (!user) throw new Error("Not authenticated");
  if (user.role === "PARENT") return user.id;
  if (!user.childId) throw new Error("Kid account is not linked to a child.");
  const child = await prisma.child.findUnique({ where: { id: user.childId }, select: { userId: true } });
  if (!child?.userId) throw new Error("Kid account is not linked to a parent.");
  return child.userId;
}

async function loadAuthorizedSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      child: {
        include: {
          kidUser: true,
          curriculumAssignments: {
            include: {
              curriculumVersion: { include: { board: true } },
              curriculumClass: true,
            },
          },
        },
      },
      chapters: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { topics: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
      },
    },
  });
  if (!subject || (subject.child.userId !== userId && subject.child.kidUser?.id !== userId)) {
    throw new Error("Subject not found.");
  }
  if (!isSupportedTestPaperSubject(subject.name)) {
    throw new Error("Online test papers are available only for Mathematics, Science, and English.");
  }
  return subject;
}

async function assertSubscription(userId: string) {
  const config = getAiConfig();
  if (!config.enabled || !config.testPaperEnabled) {
    throw new Error("AI Test Papers are turned off.");
  }
  const parentId = await resolveParentIdForUser(userId);
  const hasAccess = await canUseAiFeatures(parentId);
  if (!hasAccess) {
    throw new Error("AI Test Papers are available with Premium.");
  }
  return parentId;
}

export async function loadTestPaperSelectionForParent(userId: string) {
  const children = await prisma.child.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      subjects: {
        where: { name: { in: [...supportedTestPaperSubjects] } },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { chapters: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], include: { topics: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } } } },
      },
    },
  });
  const templates = await prisma.testTemplate.findMany({
    where: { status: TestTemplateStatus.ACTIVE },
    include: { sections: { include: { rules: true }, orderBy: { order: "asc" } } },
    orderBy: [{ subjectName: "asc" }, { createdAt: "asc" }],
  });
  return { children, templates };
}

export async function loadTestPaperSelectionForKid(userId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: { id: childId, kidUser: { id: userId } },
    include: {
      subjects: {
        where: { name: { in: [...supportedTestPaperSubjects] } },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { chapters: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], include: { topics: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } } } },
      },
    },
  });
  if (!child) throw new Error("Child not found.");
  const templates = await prisma.testTemplate.findMany({
    where: { status: TestTemplateStatus.ACTIVE },
    include: { sections: { include: { rules: true }, orderBy: { order: "asc" } } },
    orderBy: [{ subjectName: "asc" }, { createdAt: "asc" }],
  });
  return { child, templates };
}

async function reserveTopicQuota(childId: string, topicIds: string[], requestId: string, testPaperId: string) {
  const settings = { topicPromptLimit: getAiConfig().topicPromptLimit };
  await prisma.$transaction(async (tx) => {
    for (const topicId of topicIds) {
      const usage = await tx.aiTopicUsage.upsert({
        where: { childId_topicId: { childId, topicId } },
        create: { childId, topicId, promptCount: 0 },
        update: {},
      });
      const reserved = await tx.aiTopicUsageReservation.count({
        where: { childId, topicId, status: AiQuotaReservationStatus.RESERVED },
      });
      if (usage.promptCount + reserved >= settings.topicPromptLimit) {
        throw new Error("One selected topic has no AI interactions left.");
      }
      await tx.aiTopicUsageReservation.create({
        data: {
          requestId,
          childId,
          topicId,
          usageId: usage.id,
          testPaperId,
          status: AiQuotaReservationStatus.RESERVED,
        },
      });
    }
  }, { timeout: 15000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function consumeReservedQuota(requestId: string) {
  await prisma.$transaction(async (tx) => {
    const reservations = await tx.aiTopicUsageReservation.findMany({
      where: { requestId, status: AiQuotaReservationStatus.RESERVED },
    });
    for (const reservation of reservations) {
      await tx.aiTopicUsage.update({
        where: { childId_topicId: { childId: reservation.childId, topicId: reservation.topicId } },
        data: { promptCount: { increment: 1 } },
      });
      await tx.aiTopicUsageReservation.update({
        where: { id: reservation.id },
        data: { status: AiQuotaReservationStatus.CONSUMED },
      });
    }
  }, { timeout: 15000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function releaseReservedQuota(requestId: string, failed = false) {
  await prisma.aiTopicUsageReservation.updateMany({
    where: { requestId, status: AiQuotaReservationStatus.RESERVED },
    data: { status: failed ? AiQuotaReservationStatus.FAILED : AiQuotaReservationStatus.RELEASED },
  });
}

function selectedTopicsFromSubject(subject: SubjectWithTree, topicIds: string[]) {
  const requestedTopicIds = new Set(topicIds.filter(Boolean));
  const selected = new Map<string, SubjectWithTree["chapters"][number]["topics"][number] & { chapterName: string }>();
  for (const chapter of subject.chapters) {
    for (const topic of chapter.topics) {
      if (requestedTopicIds.has(topic.id)) selected.set(topic.id, { ...topic, chapterName: chapter.name });
    }
  }
  if (!selected.size) throw new Error("Select at least one topic from the selected subject.");
  return [...selected.values()];
}

function buildSlots(
  subject: SubjectWithTree,
  template: Prisma.TestTemplateGetPayload<{ include: { sections: { include: { rules: true } } } }>,
  selectedTopics: ReturnType<typeof selectedTopicsFromSubject>,
) {
  const boardName = subject.child.curriculumAssignments[0]?.curriculumVersion.board.name ?? null;
  const slotsBySection: {
    sectionId: string;
    sectionName: string;
    sectionInstructions?: string | null;
    slots: TestPaperQuestionSlot[];
  }[] = [];
  const topicTotals = new Map<string, { topicId: string; chapterId: string; allocatedMarks: number; allocatedQuestionCount: number }>();
  let topicCursor = 0;
  let totalQuestions = 0;

  for (const section of template.sections.sort((a, b) => a.order - b.order)) {
    const slots: TestPaperQuestionSlot[] = [];
    for (const rule of section.rules.sort((a, b) => a.order - b.order)) {
      for (let index = 0; index < rule.questionCount; index += 1) {
        const topic = selectedTopics[topicCursor % selectedTopics.length];
        topicCursor += 1;
        totalQuestions += 1;
        const current = topicTotals.get(topic.id) ?? { topicId: topic.id, chapterId: topic.chapterId, allocatedMarks: 0, allocatedQuestionCount: 0 };
        current.allocatedMarks += rule.marksPerQuestion;
        current.allocatedQuestionCount += 1;
        topicTotals.set(topic.id, current);
        slots.push({
          clientQuestionId: `${section.id}-${rule.id}-${index + 1}`,
          subject: subject.name,
          className: subject.child.className,
          boardName,
          chapterId: topic.chapterId,
          chapterName: topic.chapterName,
          topicId: topic.id,
          topicName: topic.name,
          questionType: rule.questionType,
          marks: rule.marksPerQuestion,
          difficulty: rule.difficulty,
        });
      }
    }
    slotsBySection.push({
      sectionId: section.id,
      sectionName: section.name,
      sectionInstructions: section.instructions,
      slots,
    });
  }

  if (totalQuestions > getAiConfig().testPaperMaxQuestions) {
    throw new Error(`This template creates ${totalQuestions} questions. Maximum allowed is ${getAiConfig().testPaperMaxQuestions}.`);
  }

  const allocatedMarks = [...topicTotals.values()].reduce((sum, item) => sum + item.allocatedMarks, 0);
  if (allocatedMarks !== template.totalMarks) {
    throw new Error("Allocated marks do not match template total marks.");
  }

  return { slotsBySection, topicTotals: [...topicTotals.values()] };
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function validateGeneratedSection(section: GeneratedTestPaperSection, slots: TestPaperQuestionSlot[]) {
  if (section.questions.length !== slots.length) {
    throw new Error("AI returned the wrong number of questions.");
  }
  const slotById = new Map(slots.map((slot) => [slot.clientQuestionId, slot]));
  const seenText = new Set<string>();

  for (const question of section.questions) {
    const slot = slotById.get(question.clientQuestionId);
    if (!slot) throw new Error("AI returned an unknown question slot.");
    if (question.subject !== slot.subject || question.chapterId !== slot.chapterId || question.topicId !== slot.topicId) {
      throw new Error("AI returned a question outside the selected curriculum.");
    }
    if (question.questionType !== slot.questionType || question.marks !== slot.marks || question.difficulty !== slot.difficulty) {
      throw new Error("AI changed a template-controlled question field.");
    }
    const markingMarks = question.markingScheme.reduce((sum, item) => sum + item.marks, 0);
    if (markingMarks !== question.marks) {
      throw new Error("Question marking scheme does not match question marks.");
    }
    if (question.questionType === OnlineTestQuestionType.MULTIPLE_CHOICE) {
      if (!question.options || question.options.length < 2) throw new Error("MCQ questions need options.");
      const answer = normalizeText(question.correctAnswer);
      const optionMatches = question.options.filter((option) => normalizeText(option) === answer);
      if (optionMatches.length !== 1) throw new Error("MCQ questions need exactly one correct option.");
    }
    const text = normalizeText(question.questionText);
    if (seenText.has(text)) throw new Error("Duplicate question text was generated.");
    seenText.add(text);
  }
}

export async function generateOnlineTestPaper({
  userId,
  childId,
  subjectId,
  templateId,
  topicIds,
  source,
  title,
  dueAt,
  provider = createAiLearningProvider(),
}: {
  userId: string;
  childId: string;
  subjectId: string;
  templateId: string;
  topicIds: string[];
  source: OnlineTestPaperSource;
  title?: string | null;
  dueAt?: Date | null;
  provider?: Pick<AiLearningProvider, "generateTestPaperSection" | "reviewTestPaper">;
}) {
  await assertSubscription(userId);
  const subject = await loadAuthorizedSubject(userId, subjectId);
  if (subject.childId !== childId) throw new Error("Subject and child mismatch.");

  const template = await prisma.testTemplate.findUnique({
    where: { id: templateId },
    include: { sections: { include: { rules: true }, orderBy: { order: "asc" } } },
  });
  if (!template || template.status !== TestTemplateStatus.ACTIVE) throw new Error("Choose an active test template.");
  if (template.subjectName !== subject.name) throw new Error("Template subject does not match selected subject.");
  validateTemplateTotals(template);

  const selectedTopics = selectedTopicsFromSubject(subject, topicIds);
  const { slotsBySection, topicTotals } = buildSlots(subject, template, selectedTopics);
  const requestId = crypto.randomUUID();
  const boardName = subject.child.curriculumAssignments[0]?.curriculumVersion.board.name ?? null;
  const paperTitle = title?.trim() || `${subject.name} ${template.name}`;

  const paper = await prisma.onlineTestPaper.create({
    data: {
      childId,
      subjectId,
      templateId,
      createdByUserId: userId,
      source,
      title: paperTitle,
      totalMarks: template.totalMarks,
      durationMinutes: template.durationMinutes,
      difficulty: template.difficulty,
      status: OnlineTestPaperStatus.GENERATING,
      aiReviewStatus: OnlineTestAiReviewStatus.PENDING,
      generationRequestId: requestId,
      dueAt,
      assignedAt: source === OnlineTestPaperSource.ASSIGNED_BY_PARENT ? new Date() : null,
    },
  });

  try {
    await reserveTopicQuota(childId, topicTotals.map((topic) => topic.topicId), requestId, paper.id);

    const generatedSections = await Promise.all(
      slotsBySection.map(async (section) => {
        const generated = await provider.generateTestPaperSection({
          sectionName: section.sectionName,
          sectionInstructions: section.sectionInstructions,
          slots: section.slots,
        });
        validateGeneratedSection(generated, section.slots);
        return { ...section, generated };
      }),
    );

    const questions = generatedSections.flatMap((section) => section.generated.questions);
    const review = await provider.reviewTestPaper({
      className: subject.child.className,
      boardName,
      subjectName: subject.name,
      totalMarks: template.totalMarks,
      questions,
    });
    if (!review.approved || review.questionReviews.some((item) => !item.approved)) {
      throw new Error("AI teacher review rejected this paper. Please try again.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.onlineTestPaperTopic.createMany({
        data: topicTotals.map((topic) => ({ ...topic, testPaperId: paper.id })),
      });
      for (let sectionIndex = 0; sectionIndex < generatedSections.length; sectionIndex += 1) {
        const generatedSection = generatedSections[sectionIndex];
        const savedSection = await tx.onlineTestSection.create({
          data: {
            testPaperId: paper.id,
            name: generatedSection.sectionName,
            instructions: generatedSection.sectionInstructions,
            order: sectionIndex,
          },
        });
        await tx.onlineTestQuestion.createMany({
          data: generatedSection.generated.questions.map((question, questionIndex) => ({
            testPaperId: paper.id,
            sectionId: savedSection.id,
            chapterId: question.chapterId,
            topicId: question.topicId,
            questionType: question.questionType,
            questionText: question.questionText,
            optionsJson: question.options ?? Prisma.JsonNull,
            correctAnswerJson: question.correctAnswer as Prisma.InputJsonValue,
            markingSchemeJson: question.markingScheme as Prisma.InputJsonValue,
            explanation: question.explanation,
            marks: question.marks,
            difficulty: question.difficulty,
            order: questionIndex,
            aiReviewStatus: OnlineTestAiReviewStatus.PASSED,
          })),
        });
      }
      await tx.onlineTestPaper.update({
        where: { id: paper.id },
        data: {
          status: source === OnlineTestPaperSource.SELF_PRACTICE ? OnlineTestPaperStatus.IN_PROGRESS : OnlineTestPaperStatus.ASSIGNED,
          aiReviewStatus: OnlineTestAiReviewStatus.PASSED,
          aiReviewJson: review as Prisma.InputJsonValue,
        },
      });
      if (source === OnlineTestPaperSource.SELF_PRACTICE) {
        await tx.onlineTestAttempt.create({
          data: {
            testPaperId: paper.id,
            childId,
            status: OnlineTestAttemptStatus.IN_PROGRESS,
            startedAt: new Date(),
          },
        });
      }
    }, { timeout: 15000 });

    await consumeReservedQuota(requestId);
    return paper.id;
  } catch (error) {
    await releaseReservedQuota(requestId, true).catch(() => undefined);
    await prisma.onlineTestPaper.update({
      where: { id: paper.id },
      data: { status: OnlineTestPaperStatus.FAILED, aiReviewStatus: OnlineTestAiReviewStatus.FAILED },
    }).catch(() => undefined);
    throw error;
  }
}

export async function loadOnlineTestPapersForParent(userId: string) {
  return prisma.onlineTestPaper.findMany({
    where: { child: { userId } },
    include: { child: true, subject: true, template: true, attempts: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function loadOnlineTestPapersForKid(childId: string) {
  return prisma.onlineTestPaper.findMany({
    where: {
      childId,
      status: { in: [OnlineTestPaperStatus.ASSIGNED, OnlineTestPaperStatus.IN_PROGRESS, OnlineTestPaperStatus.SUBMITTED, OnlineTestPaperStatus.EVALUATED] },
    },
    include: { child: true, subject: true, template: true, attempts: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOwnedOnlineTestPaper(userId: string, paperId: string): Promise<OnlineTestPaperTree> {
  const paper = await prisma.onlineTestPaper.findUnique({
    where: { id: paperId },
    include: {
      child: { include: { kidUser: true } },
      subject: true,
      template: true,
      topics: { include: { topic: true, chapter: true } },
      sections: { orderBy: { order: "asc" }, include: { questions: { orderBy: { order: "asc" }, include: { topic: true, chapter: true } } } },
      attempts: { orderBy: { createdAt: "desc" }, include: { answers: { include: { question: true } } } },
    },
  });
  if (!paper || (paper.child.userId !== userId && paper.child.kidUser?.id !== userId)) {
    throw new Error("Test paper not found.");
  }
  return paper;
}

export async function startOnlineTestAttempt(userId: string, paperId: string) {
  const paper = await getOwnedOnlineTestPaper(userId, paperId);
  if (paper.status !== OnlineTestPaperStatus.ASSIGNED && paper.status !== OnlineTestPaperStatus.IN_PROGRESS) {
    throw new Error("This paper is not available for taking.");
  }
  const existing = paper.attempts.find((attempt) => attempt.status === OnlineTestAttemptStatus.IN_PROGRESS);
  if (existing) return existing.id;
  const attempt = await prisma.onlineTestAttempt.create({
    data: {
      testPaperId: paper.id,
      childId: paper.childId,
      status: OnlineTestAttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
    },
  });
  await prisma.onlineTestPaper.update({ where: { id: paper.id }, data: { status: OnlineTestPaperStatus.IN_PROGRESS } });
  return attempt.id;
}

function deterministicMarks(question: OnlineTestPaperTree["sections"][number]["questions"][number], answerText: string) {
  const expected = normalizeText(question.correctAnswerJson);
  const answer = normalizeText(answerText);
  if (!answer) return 0;
  if (question.questionType === OnlineTestQuestionType.NUMERICAL && Array.isArray((question.correctAnswerJson as { acceptedAnswers?: string[] })?.acceptedAnswers)) {
    const accepted = (question.correctAnswerJson as { acceptedAnswers: string[] }).acceptedAnswers;
    return accepted.some((value) => normalizeText(value) === answer) ? question.marks : 0;
  }
  return expected === answer ? question.marks : 0;
}

export async function submitOnlineTestAttempt({
  userId,
  attemptId,
  answers,
  provider = createAiLearningProvider(),
}: {
  userId: string;
  attemptId: string;
  answers: Record<string, string>;
  provider?: Pick<AiLearningProvider, "evaluateSubjectiveAnswer">;
}) {
  const attempt = await prisma.onlineTestAttempt.findUnique({
    where: { id: attemptId },
    include: {
      testPaper: {
        include: {
          child: { include: { kidUser: true, curriculumAssignments: { include: { curriculumVersion: { include: { board: true } } } } } },
          subject: true,
          sections: { include: { questions: { include: { topic: true, chapter: true } } } },
        },
      },
    },
  });
  if (!attempt || (attempt.testPaper.child.userId !== userId && attempt.testPaper.child.kidUser?.id !== userId)) {
    throw new Error("Test attempt not found.");
  }
  if (attempt.status === OnlineTestAttemptStatus.SUBMITTED || attempt.status === OnlineTestAttemptStatus.EVALUATED) {
    throw new Error("This test has already been submitted.");
  }

  const boardName = attempt.testPaper.child.curriculumAssignments[0]?.curriculumVersion.board.name ?? null;
  const threshold = getAiConfig().evaluationReviewThreshold;
  let aiAwardedMarks = 0;
  let finalMarks = 0;
  let needsReview = false;
  const allAnswers: Prisma.OnlineTestAnswerCreateManyInput[] = [];

  for (const question of attempt.testPaper.sections.flatMap((section) => section.questions)) {
    const answerText = answers[question.id] ?? "";
    let awarded = 0;
    let confidence = 1;
    let feedback = question.explanation;
    if (subjectiveTypes.has(question.questionType)) {
      const evaluation = await provider.evaluateSubjectiveAnswer({
        className: attempt.testPaper.child.className,
        boardName,
        subjectName: attempt.testPaper.subject.name,
        chapterName: question.chapter.name,
        topicName: question.topic.name,
        questionType: question.questionType,
        questionText: question.questionText,
        maximumMarks: question.marks,
        correctAnswer: question.correctAnswerJson,
        markingScheme: question.markingSchemeJson,
        studentAnswer: answerText,
      });
      awarded = Math.min(question.marks, Math.max(0, evaluation.awardedMarks));
      confidence = evaluation.confidence;
      feedback = evaluation.feedback;
      if (confidence < threshold) needsReview = true;
    } else {
      awarded = deterministicMarks(question, answerText);
    }
    aiAwardedMarks += awarded;
    finalMarks += awarded;
    allAnswers.push({
      attemptId,
      questionId: question.id,
      answerText,
      aiAwardedMarks: awarded,
      finalMarks: awarded,
      aiFeedback: feedback,
      evaluationConfidence: confidence,
      needsReview: confidence < threshold,
    });
  }

  const percentage = attempt.testPaper.totalMarks ? Math.round((finalMarks / attempt.testPaper.totalMarks) * 100) : 0;
  const status = needsReview ? OnlineTestAttemptStatus.NEEDS_REVIEW : OnlineTestAttemptStatus.EVALUATED;
  await prisma.$transaction(async (tx) => {
    await tx.onlineTestAnswer.createMany({ data: allAnswers });
    await tx.onlineTestAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        submittedAt: new Date(),
        evaluatedAt: new Date(),
        aiAwardedMarks,
        finalMarks,
        percentage,
        overallFeedback: needsReview ? "Some answers need parent review." : "Your test has been evaluated.",
      },
    });
    await tx.onlineTestPaper.update({
      where: { id: attempt.testPaperId },
      data: { status: needsReview ? OnlineTestPaperStatus.SUBMITTED : OnlineTestPaperStatus.EVALUATED },
    });
  }, { timeout: 15000 });

  return { paperId: attempt.testPaperId, percentage, needsReview };
}

export async function getTopicUsageForPaper(paper: OnlineTestPaperTree) {
  return Promise.all(paper.topics.map(async (paperTopic) => ({
    topicId: paperTopic.topicId,
    usage: await getAiUsage(paper.childId, paperTopic.topicId),
  })));
}
