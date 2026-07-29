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
  onlineTestPaperIdSchema,
  onlineTestSubmitSchema,
  templateRuleIdSchema,
  templateSectionIdSchema,
  templateIdSchema,
  updateTestTemplateRuleSchema,
  updateTestTemplateSchema,
  updateTestTemplateSectionSchema,
} from "@/features/ai/schema";
import {
  allowedQuestionTypesForSubject,
  deleteFailedOnlineTestPapersForParent,
  deleteOwnedOnlineTestPaper,
  generateOnlineTestPaper,
  getOwnedOnlineTestPaper,
  startOnlineTestAttempt,
  submitOnlineTestAttempt,
  validateTemplateTotals,
} from "./service";

function revalidateTemplateAdmin() {
  revalidatePath("/admin/test-templates");
}

async function ensureEditableTemplate(templateId: string) {
  const template = await prisma.testTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, status: true },
  });
  if (!template) throw new Error("Template not found.");
  if (template.status === TestTemplateStatus.ARCHIVED) {
    throw new Error("Archived templates cannot be changed. Clone it first.");
  }
  return template;
}

async function markTemplateDraftIfNeeded(templateId: string) {
  await prisma.testTemplate.update({
    where: { id: templateId },
    data: { status: TestTemplateStatus.DRAFT },
  });
}

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
  revalidateTemplateAdmin();
  redirect(`/admin/test-templates?templateId=${template.id}`);
}

export async function updateTestTemplateAction(formData: FormData) {
  await requireAdminUser();
  const data = updateTestTemplateSchema.parse(formDataToObject(formData));
  await ensureEditableTemplate(data.templateId);
  await prisma.testTemplate.update({
    where: { id: data.templateId },
    data: {
      name: data.name,
      subjectName: data.subjectName,
      totalMarks: data.totalMarks,
      durationMinutes: data.durationMinutes,
      difficulty: data.difficulty as OnlineTestDifficulty,
      status: TestTemplateStatus.DRAFT,
    },
  });
  revalidateTemplateAdmin();
  redirect(`/admin/test-templates?templateId=${data.templateId}`);
}

export async function addTestTemplateSectionAction(formData: FormData) {
  await requireAdminUser();
  const data = createTestTemplateSectionSchema.parse(formDataToObject(formData));
  await ensureEditableTemplate(data.templateId);
  const count = await prisma.testTemplateSection.count({ where: { templateId: data.templateId } });
  await prisma.testTemplateSection.create({
    data: {
      templateId: data.templateId,
      name: data.name,
      instructions: data.instructions || null,
      order: count,
    },
  });
  await markTemplateDraftIfNeeded(data.templateId);
  revalidateTemplateAdmin();
}

export async function updateTestTemplateSectionAction(formData: FormData) {
  await requireAdminUser();
  const data = updateTestTemplateSectionSchema.parse(formDataToObject(formData));
  const section = await prisma.testTemplateSection.findUnique({
    where: { id: data.sectionId },
    select: { templateId: true },
  });
  if (!section || section.templateId !== data.templateId) throw new Error("Template section not found.");
  await ensureEditableTemplate(section.templateId);
  await prisma.testTemplateSection.update({
    where: { id: data.sectionId },
    data: {
      name: data.name,
      instructions: data.instructions || null,
    },
  });
  await markTemplateDraftIfNeeded(section.templateId);
  revalidateTemplateAdmin();
}

export async function deleteTestTemplateSectionAction(formData: FormData) {
  await requireAdminUser();
  const { sectionId } = templateSectionIdSchema.parse(formDataToObject(formData));
  const section = await prisma.testTemplateSection.findUnique({
    where: { id: sectionId },
    select: { templateId: true },
  });
  if (!section) throw new Error("Template section not found.");
  await ensureEditableTemplate(section.templateId);
  await prisma.testTemplateSection.delete({ where: { id: sectionId } });
  await markTemplateDraftIfNeeded(section.templateId);
  revalidateTemplateAdmin();
}

export async function addTestTemplateRuleAction(formData: FormData) {
  await requireAdminUser();
  const data = createTestTemplateRuleSchema.parse(formDataToObject(formData));
  const section = await prisma.testTemplateSection.findUnique({
    where: { id: data.sectionId },
    include: { template: true },
  });
  if (!section) throw new Error("Template section not found.");
  await ensureEditableTemplate(section.templateId);
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
  await markTemplateDraftIfNeeded(section.templateId);
  revalidateTemplateAdmin();
}

export async function updateTestTemplateRuleAction(formData: FormData) {
  await requireAdminUser();
  const data = updateTestTemplateRuleSchema.parse(formDataToObject(formData));
  const rule = await prisma.testTemplateRule.findUnique({
    where: { id: data.ruleId },
    include: { section: { include: { template: true } } },
  });
  if (!rule || rule.sectionId !== data.sectionId) throw new Error("Template rule not found.");
  await ensureEditableTemplate(rule.section.templateId);
  if (!allowedQuestionTypesForSubject(rule.section.template.subjectName).has(data.questionType as OnlineTestQuestionType)) {
    throw new Error("Question type is not allowed for this subject.");
  }
  await prisma.testTemplateRule.update({
    where: { id: data.ruleId },
    data: {
      questionType: data.questionType as OnlineTestQuestionType,
      marksPerQuestion: data.marksPerQuestion,
      questionCount: data.questionCount,
      difficulty: data.difficulty as OnlineTestDifficulty,
    },
  });
  await markTemplateDraftIfNeeded(rule.section.templateId);
  revalidateTemplateAdmin();
}

export async function deleteTestTemplateRuleAction(formData: FormData) {
  await requireAdminUser();
  const { ruleId } = templateRuleIdSchema.parse(formDataToObject(formData));
  const rule = await prisma.testTemplateRule.findUnique({
    where: { id: ruleId },
    select: { section: { select: { templateId: true } } },
  });
  if (!rule) throw new Error("Template rule not found.");
  await ensureEditableTemplate(rule.section.templateId);
  await prisma.testTemplateRule.delete({ where: { id: ruleId } });
  await markTemplateDraftIfNeeded(rule.section.templateId);
  revalidateTemplateAdmin();
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
  revalidateTemplateAdmin();
}

export async function archiveTestTemplateAction(formData: FormData) {
  await requireAdminUser();
  const { templateId } = templateIdSchema.parse(formDataToObject(formData));
  await prisma.testTemplate.update({
    where: { id: templateId },
    data: { status: TestTemplateStatus.ARCHIVED },
  });
  revalidateTemplateAdmin();
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
  revalidateTemplateAdmin();
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

export async function deleteOnlineTestPaperAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const { paperId } = onlineTestPaperIdSchema.parse(formDataToObject(formData));
  await deleteOwnedOnlineTestPaper(currentUser.id, paperId);
  revalidatePath("/test-papers");
  revalidatePath("/kid/tests");
  redirect(currentUser.role === "KID" ? "/kid/tests" : "/test-papers");
}

export async function deleteFailedOnlineTestPapersAction() {
  const parent = await requireParentUser();
  await deleteFailedOnlineTestPapersForParent(parent.id);
  revalidatePath("/test-papers");
  revalidatePath("/kid/tests");
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
