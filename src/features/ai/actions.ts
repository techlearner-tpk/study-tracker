"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, requireParentUser } from "@/lib/auth";
import { getOwnedTopic } from "@/lib/ownership";
import { formDataToObject } from "@/lib/validations";
import { aiTeachMessageSchema, aiTeachRequestSchema, aiTestRequestSchema, aiTestSubmissionSchema } from "./schema";
import { getAiSession, generateTopicTest, resetAiUsage, sendTeachMessage, startTeachSession, submitTopicTest } from "./service";

export async function startTeachSessionAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const data = aiTeachRequestSchema.parse(formDataToObject(formData));
  const result = await startTeachSession(currentUser.id, data.topicId, data.assignmentId);
  redirect(`/ai/teach/${data.topicId}/${result.sessionId}`);
}

export async function startTestSessionAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const data = aiTestRequestSchema.parse(formDataToObject(formData));
  const result = await generateTopicTest(currentUser.id, data.topicId, data.assignmentId);
  redirect(`/ai/test/${data.topicId}/${result.sessionId}`);
}

export async function sendTeachMessageAction(formData: FormData) {
  const data = aiTeachMessageSchema.parse(formDataToObject(formData));
  await sendTeachMessage(formData);
  const session = await getAiSession(data.sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  redirect(`/ai/teach/${session.topicId}/${session.id}`);
}

export async function submitTopicTestAction(formData: FormData) {
  const data = aiTestSubmissionSchema.parse(formDataToObject(formData));
  await submitTopicTest(formData);
  const session = await getAiSession(data.sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  redirect(`/ai/test/${session.topicId}/${session.id}`);
}

export async function activateFamilySubscriptionAction() {
  const parent = await requireParentUser();
  await prisma.subscription.upsert({
    where: { parentId: parent.id },
    update: { status: SubscriptionStatus.ACTIVE, startsAt: new Date(), expiresAt: null },
    create: { parentId: parent.id, status: SubscriptionStatus.ACTIVE, startsAt: new Date() },
  });
  redirect("/admin/ai");
}

export async function deactivateFamilySubscriptionAction() {
  const parent = await requireParentUser();
  await prisma.subscription.upsert({
    where: { parentId: parent.id },
    update: { status: SubscriptionStatus.FREE, expiresAt: new Date() },
    create: { parentId: parent.id, status: SubscriptionStatus.FREE },
  });
  redirect("/admin/ai");
}

export async function saveAiSettingsAction(formData: FormData) {
  await requireParentUser();
  const topicPromptLimit = Number(formData.get("topicPromptLimit") ?? 5);
  const testQuestionCount = Number(formData.get("testQuestionCount") ?? 5);
  const maxUserPromptLength = Number(formData.get("maxUserPromptLength") ?? 500);

  await prisma.aiSetting.upsert({
    where: { id: 1 },
    update: {
      topicPromptLimit,
      testQuestionCount,
      maxUserPromptLength,
    },
    create: {
      id: 1,
      topicPromptLimit,
      testQuestionCount,
      maxUserPromptLength,
    },
  });
  redirect("/admin/ai");
}

export async function resetAiUsageAction(formData: FormData) {
  await requireParentUser();
  const childId = String(formData.get("childId") ?? "").trim();
  const topicId = String(formData.get("topicId") ?? "").trim();
  if (!childId || !topicId) {
    throw new Error("Child and topic are required");
  }
  await resetAiUsage(childId, topicId);
  redirect("/admin/ai");
}

export async function deleteTopicAiHistoryAction(formData: FormData) {
  const parent = await requireParentUser();
  const topicId = String(formData.get("topicId") ?? "").trim();
  if (!topicId) {
    throw new Error("Topic is required");
  }

  const topic = await getOwnedTopic(parent.id, topicId);
  const childId = topic.chapter.subject.child.id;

  await prisma.$transaction(async (tx) => {
    await tx.aiLearningSession.deleteMany({
      where: {
        topicId,
        childId,
      },
    });
    await tx.aiTopicUsage.deleteMany({
      where: {
        topicId,
        childId,
      },
    });
    await tx.aiTestAttempt.deleteMany({
      where: {
        topicId,
        childId,
      },
    });
  });

  revalidatePath(`/topics/${topicId}`);
  revalidatePath(`/kid/topics/${topicId}`);
  redirect(`/topics/${topicId}`);
}
