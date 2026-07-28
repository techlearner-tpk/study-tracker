"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OnlineTestDifficulty, OnlineTestPaperSource, OnlineTestQuestionType, TestTemplateStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, requireCurrentUser, requireParentUser } from "@/lib/auth";
import { formDataToObject } from "@/lib/validations";
import {
  createTestTemplateRuleSchema,
  createTestTemplateSchema,
  createTestTemplateSectionSchema,
  generateOnlineTestPaperSchema,
  onlineTestSubmitSchema,
  templateIdSchema,
} from "@/features/ai/schema";
import {
  allowedQuestionTypesForSubject,
  generateOnlineTestPaper,
  getOwnedOnlineTestPaper,
  startOnlineTestAttempt,
  submitOnlineTestAttempt,
  validateTemplateTotals,
} from "./service";

export async function createTestTemplateAction(formData: FormData) {
  const admin = await requireAdminUser();
  const data = createTestTemplateSchema.parse(formDataToObject(formData));
  const template = await prisma.testTemplate.create({
    data: {
      name: data.name,
      subjectName: data.subjectName,
      totalMarks: data.totalMarks,
      durationMinutes: data.durationMinutes,
      difficulty: data.difficulty as OnlineTestDifficulty,
      createdByUserId: admin.id,
    },
  });
  revalidatePath("/admin/test-templates");
  redirect(`/admin/test-templates?templateId=${template.id}`);
}

export async function addTestTemplateSectionAction(formData: FormData) {
  await requireAdminUser();
  const data = createTestTemplateSectionSchema.parse(formDataToObject(formData));
  const count = await prisma.testTemplateSection.count({ where: { templateId: data.templateId } });
  await prisma.testTemplateSection.create({
    data: {
      templateId: data.templateId,
      name: data.name,
      instructions: data.instructions || null,
      order: count,
    },
  });
  revalidatePath("/admin/test-templates");
}

export async function addTestTemplateRuleAction(formData: FormData) {
  await requireAdminUser();
  const data = createTestTemplateRuleSchema.parse(formDataToObject(formData));
  const section = await prisma.testTemplateSection.findUnique({
    where: { id: data.sectionId },
    include: { template: true },
  });
  if (!section) throw new Error("Template section not found.");
  if (!allowedQuestionTypesForSubject(section.template.subjectName).has(data.questionType as OnlineTestQuestionType)) {
    throw new Error("Question type is not allowed for this subject.");
  }
  const count = await prisma.testTemplateRule.count({ where: { sectionId: data.sectionId } });
  await prisma.testTemplateRule.create({
    data: {
      sectionId: data.sectionId,
      questionType: data.questionType as OnlineTestQuestionType,
      marksPerQuestion: data.marksPerQuestion,
      questionCount: data.questionCount,
      difficulty: data.difficulty as OnlineTestDifficulty,
      order: count,
    },
  });
  revalidatePath("/admin/test-templates");
}

export async function activateTestTemplateAction(formData: FormData) {
  await requireAdminUser();
  const { templateId } = templateIdSchema.parse(formDataToObject(formData));
  const template = await prisma.testTemplate.findUnique({
    where: { id: templateId },
    include: { sections: { include: { rules: true } } },
  });
  if (!template) throw new Error("Template not found.");
  validateTemplateTotals(template);
  await prisma.testTemplate.update({
    where: { id: templateId },
    data: { status: TestTemplateStatus.ACTIVE },
  });
  revalidatePath("/admin/test-templates");
}

export async function archiveTestTemplateAction(formData: FormData) {
  await requireAdminUser();
  const { templateId } = templateIdSchema.parse(formDataToObject(formData));
  await prisma.testTemplate.update({
    where: { id: templateId },
    data: { status: TestTemplateStatus.ARCHIVED },
  });
  revalidatePath("/admin/test-templates");
}

export async function cloneTestTemplateAction(formData: FormData) {
  const admin = await requireAdminUser();
  const { templateId } = templateIdSchema.parse(formDataToObject(formData));
  const template = await prisma.testTemplate.findUnique({
    where: { id: templateId },
    include: { sections: { include: { rules: true }, orderBy: { order: "asc" } } },
  });
  if (!template) throw new Error("Template not found.");
  const clone = await prisma.testTemplate.create({
    data: {
      name: `${template.name} copy`,
      subjectName: template.subjectName,
      totalMarks: template.totalMarks,
      durationMinutes: template.durationMinutes,
      difficulty: template.difficulty,
      createdByUserId: admin.id,
      sections: {
        create: template.sections.map((section) => ({
          name: section.name,
          instructions: section.instructions,
          order: section.order,
          rules: {
            create: section.rules.map((rule) => ({
              questionType: rule.questionType,
              marksPerQuestion: rule.marksPerQuestion,
              questionCount: rule.questionCount,
              difficulty: rule.difficulty,
              internalChoiceCount: rule.internalChoiceCount,
              order: rule.order,
            })),
          },
        })),
      },
    },
  });
  revalidatePath("/admin/test-templates");
  redirect(`/admin/test-templates?templateId=${clone.id}`);
}

export async function generateOnlineTestPaperAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const data = generateOnlineTestPaperSchema.parse(formDataToObject(formData));
  const source = data.source as OnlineTestPaperSource;
  if (currentUser.role === "KID" && source !== OnlineTestPaperSource.SELF_PRACTICE) {
    throw new Error("Kids can create only self-practice tests.");
  }
  if (currentUser.role === "PARENT" && source !== OnlineTestPaperSource.ASSIGNED_BY_PARENT) {
    throw new Error("Parents must create assigned tests.");
  }
  const dueAt = data.dueAt ? new Date(data.dueAt) : null;
  const paperId = await generateOnlineTestPaper({
    userId: currentUser.id,
    childId: data.childId,
    subjectId: data.subjectId,
    templateId: data.templateId,
    topicIds: data.topicIds,
    source,
    title: data.title,
    dueAt,
  });
  revalidatePath("/test-papers");
  revalidatePath("/kid/tests");
  redirect(source === OnlineTestPaperSource.SELF_PRACTICE ? `/kid/tests/${paperId}/take` : `/test-papers/${paperId}`);
}

export async function startOnlineTestAttemptAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const { paperId } = onlineTestSubmitSchema.pick({ paperId: true }).parse(formDataToObject(formData));
  await startOnlineTestAttempt(currentUser.id, paperId);
  redirect(currentUser.role === "KID" ? `/kid/tests/${paperId}/take` : `/test-papers/${paperId}/take`);
}

export async function submitOnlineTestAttemptAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const data = onlineTestSubmitSchema.parse(formDataToObject(formData));
  await getOwnedOnlineTestPaper(currentUser.id, data.paperId);
  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("answer_")) {
      answers[key.replace(/^answer_/, "")] = String(value);
    }
  }
  await submitOnlineTestAttempt({ userId: currentUser.id, attemptId: data.attemptId, answers });
  revalidatePath(`/test-papers/${data.paperId}`);
  revalidatePath(`/kid/tests/${data.paperId}`);
  redirect(currentUser.role === "KID" ? `/kid/tests/${data.paperId}` : `/test-papers/${data.paperId}`);
}

export async function acceptAiOnlineTestMarksAction(formData: FormData) {
  await requireParentUser();
  const { paperId } = onlineTestSubmitSchema.pick({ paperId: true }).parse(formDataToObject(formData));
  const paper = await prisma.onlineTestPaper.findUnique({
    where: { id: paperId },
    include: { attempts: { include: { answers: true } } },
  });
  if (!paper) throw new Error("Test paper not found.");
  const attempt = paper.attempts[0];
  if (!attempt) throw new Error("Attempt not found.");
  await prisma.onlineTestAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "EVALUATED",
      finalMarks: attempt.aiAwardedMarks,
      percentage: paper.totalMarks && attempt.aiAwardedMarks != null ? Math.round((attempt.aiAwardedMarks / paper.totalMarks) * 100) : attempt.percentage,
    },
  });
  await prisma.onlineTestAnswer.updateMany({
    where: { attemptId: attempt.id },
    data: { needsReview: false },
  });
  revalidatePath(`/test-papers/${paperId}`);
}
