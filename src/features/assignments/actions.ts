"use server";

import { AssignmentSource, AssignmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { getOwnedAssignment, getOwnedChild, getOwnedTopic } from "@/lib/ownership";
import { formDataToObject } from "@/lib/validations";
import {
  assignmentFormSchema,
  assignmentScoreSchema,
  assignmentStatusUpdateSchema,
} from "./schema";

function assignmentRedirectPath(isKid: boolean, assignmentId: string) {
  return isKid ? `/kid/assignments/${assignmentId}` : `/assignments/${assignmentId}`;
}

function invalidateAssignmentPaths(isKid: boolean, assignmentId?: string, childId?: string) {
  revalidatePath("/");
  revalidatePath(isKid ? "/kid/assignments" : "/assignments");
  if (assignmentId) {
    revalidatePath(isKid ? `/kid/assignments/${assignmentId}` : `/assignments/${assignmentId}`);
  }
  if (childId) {
    revalidatePath(`/children/${childId}`);
  }
}

export async function createAssignment(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const data = assignmentFormSchema.parse(formDataToObject(formData));
  const source = currentUser.role === "KID" ? AssignmentSource.SELF : AssignmentSource.PARENT;
  const childId = currentUser.role === "KID" ? currentUser.childId : data.childId;

  if (!childId) {
    throw new Error("Choose a child");
  }

  if (currentUser.role === "PARENT") {
    await getOwnedChild(currentUser.id, childId);
  } else if (currentUser.childId !== childId) {
    throw new Error("Kids can only self-assign to themselves");
  }

  const topic = await getOwnedTopic(currentUser.id, data.topicId);
  if (topic.chapter.subject.child.id !== childId) {
    throw new Error("Choose a topic from the selected child");
  }

  const duplicate = await prisma.assignment.findFirst({
    where: {
      childId,
      topicId: data.topicId,
      type: data.type,
      isActive: true,
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error("An active assignment already exists for this topic and type");
  }

  const assignment = await prisma.assignment.create({
    data: {
      childId,
      topicId: data.topicId,
      assignedByUserId: currentUser.id,
      source,
      type: data.type,
      priority: data.priority,
      plannedDate: data.plannedDate ?? null,
      dueDate: data.dueDate ?? null,
      instructions: data.instructions ?? null,
      studySessionTarget: data.studySessionTarget ?? null,
      practiceSessionTarget: data.practiceSessionTarget ?? null,
      questionTarget: data.questionTarget ?? null,
      maximumMarks: data.maximumMarks ?? null,
      passingMarks: data.passingMarks ?? null,
      durationMinutes: data.durationMinutes ?? null,
      score: data.score ?? null,
    },
  });

  invalidateAssignmentPaths(currentUser.role === "KID", assignment.id, childId);
  redirect(assignmentRedirectPath(currentUser.role === "KID", assignment.id));
}

export async function startAssignment(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const data = assignmentStatusUpdateSchema.parse(formDataToObject(formData));
  const assignment = await getOwnedAssignment(currentUser.id, data.id);

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      status: AssignmentStatus.IN_PROGRESS,
      isActive: true,
    },
  });

  invalidateAssignmentPaths(currentUser.role === "KID", assignment.id, assignment.childId);
  redirect(assignmentRedirectPath(currentUser.role === "KID", assignment.id));
}

export async function completeAssignment(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const data = assignmentStatusUpdateSchema.parse(formDataToObject(formData));
  const assignment = await getOwnedAssignment(currentUser.id, data.id);

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      status: AssignmentStatus.COMPLETED,
      isActive: false,
      completedAt: new Date(),
    },
  });

  invalidateAssignmentPaths(currentUser.role === "KID", assignment.id, assignment.childId);
  redirect(assignmentRedirectPath(currentUser.role === "KID", assignment.id));
}

export async function skipAssignment(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const data = assignmentStatusUpdateSchema.parse(formDataToObject(formData));
  const assignment = await getOwnedAssignment(currentUser.id, data.id);

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      status: AssignmentStatus.SKIPPED,
      isActive: false,
    },
  });

  invalidateAssignmentPaths(currentUser.role === "KID", assignment.id, assignment.childId);
  redirect(assignmentRedirectPath(currentUser.role === "KID", assignment.id));
}

export async function saveAssignmentScore(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const data = assignmentScoreSchema.parse(formDataToObject(formData));
  const assignment = await getOwnedAssignment(currentUser.id, data.id);

  if (assignment.type !== "TEST") {
    throw new Error("Scores are only for test assignments");
  }

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      score: data.score,
    },
  });

  invalidateAssignmentPaths(currentUser.role === "KID", assignment.id, assignment.childId);
  redirect(assignmentRedirectPath(currentUser.role === "KID", assignment.id));
}

export async function createStudySessionFromAssignment(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const topicId = String(formData.get("topicId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!assignmentId) throw new Error("Assignment is required");
  const assignment = await getOwnedAssignment(currentUser.id, assignmentId);
  if (assignment.topicId !== topicId) {
    throw new Error("Assignment topic mismatch");
  }

  const startTime = new Date(String(formData.get("startTime") ?? ""));
  const endTime = new Date(String(formData.get("endTime") ?? ""));
  const durationMinutes = Number(formData.get("durationMinutes") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  await prisma.studySession.create({
    data: {
      topicId,
      assignmentId,
      startTime,
      endTime,
      durationMinutes,
      notes,
    },
  });

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: AssignmentStatus.IN_PROGRESS, isActive: true },
  });

  invalidateAssignmentPaths(currentUser.role === "KID", assignmentId, assignment.childId);
  revalidatePath(`/topics/${topicId}`);
}

export async function createPracticeSessionFromAssignment(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const topicId = String(formData.get("topicId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!assignmentId) throw new Error("Assignment is required");
  const assignment = await getOwnedAssignment(currentUser.id, assignmentId);
  if (assignment.topicId !== topicId) {
    throw new Error("Assignment topic mismatch");
  }

  const date = new Date(String(formData.get("date") ?? ""));
  const durationMinutes = Number(formData.get("durationMinutes") ?? 0);
  const questionsAttempted = formData.get("questionsAttempted") ? Number(formData.get("questionsAttempted")) : undefined;
  const questionsCorrect = formData.get("questionsCorrect") ? Number(formData.get("questionsCorrect")) : undefined;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  await prisma.practiceSession.create({
    data: {
      topicId,
      assignmentId,
      date,
      durationMinutes,
      questionsAttempted,
      questionsCorrect,
      notes,
    },
  });

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: AssignmentStatus.IN_PROGRESS, isActive: true },
  });

  invalidateAssignmentPaths(currentUser.role === "KID", assignmentId, assignment.childId);
  revalidatePath(`/topics/${topicId}`);
}

export async function createRevisionSessionFromAssignment(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const topicId = String(formData.get("topicId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!assignmentId) throw new Error("Assignment is required");
  const assignment = await getOwnedAssignment(currentUser.id, assignmentId);
  if (assignment.topicId !== topicId) {
    throw new Error("Assignment topic mismatch");
  }

  const date = new Date(String(formData.get("date") ?? ""));
  const durationMinutes = Number(formData.get("durationMinutes") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  await prisma.revisionSession.create({
    data: {
      topicId,
      assignmentId,
      date,
      durationMinutes,
      notes,
    },
  });

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: AssignmentStatus.IN_PROGRESS, isActive: true },
  });

  invalidateAssignmentPaths(currentUser.role === "KID", assignmentId, assignment.childId);
  revalidatePath(`/topics/${topicId}`);
}
