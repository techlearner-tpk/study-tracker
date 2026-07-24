"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnedAssignment, getOwnedTopic } from "@/lib/ownership";
import { requireCurrentUser } from "@/lib/auth";
import { formDataToObject, practiceSessionSchema } from "@/lib/validations";

function topicRedirectPath(isKid: boolean, topicId: string) {
  return isKid ? `/kid/topics/${topicId}` : `/topics/${topicId}`;
}

export async function createPracticeSession(formData: FormData) {
  const user = await requireCurrentUser();
  const data = practiceSessionSchema.parse(formDataToObject(formData));
  await getOwnedTopic(user.id, data.topicId);
  await prisma.practiceSession.create({ data });
  if (data.assignmentId) {
    const assignment = await getOwnedAssignment(user.id, data.assignmentId);
    if (assignment.topicId !== data.topicId) {
      throw new Error("Assignment topic mismatch");
    }
    await prisma.assignment.update({ where: { id: assignment.id }, data: { status: AssignmentStatus.IN_PROGRESS, isActive: true } });
    revalidatePath(`/assignments/${assignment.id}`);
    revalidatePath(`/kid/assignments/${assignment.id}`);
    redirect(`${user.role === "KID" ? `/kid/assignments/${assignment.id}` : `/assignments/${assignment.id}`}?practiceStatus=logged`);
  }
  revalidatePath(`/topics/${data.topicId}`);
  revalidatePath("/");
  redirect(`${topicRedirectPath(user.role === "KID", data.topicId)}?practiceStatus=logged`);
}
