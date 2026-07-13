"use server";

import { revalidatePath } from "next/cache";
import { AssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnedAssignment, getOwnedTopic } from "@/lib/ownership";
import { requireCurrentUser } from "@/lib/auth";
import { formDataToObject, studySessionSchema } from "@/lib/validations";

export async function createStudySession(formData: FormData) {
  const user = await requireCurrentUser();
  const data = studySessionSchema.parse(formDataToObject(formData));
  await getOwnedTopic(user.id, data.topicId);
  await prisma.studySession.create({ data });
  await prisma.topic.update({ where: { id: data.topicId }, data: { status: "IN_PROGRESS" } });
  if (data.assignmentId) {
    const assignment = await getOwnedAssignment(user.id, data.assignmentId);
    if (assignment.topicId !== data.topicId) {
      throw new Error("Assignment topic mismatch");
    }
    await prisma.assignment.update({ where: { id: assignment.id }, data: { status: AssignmentStatus.IN_PROGRESS, isActive: true } });
    revalidatePath(`/assignments/${assignment.id}`);
    revalidatePath(`/kid/assignments/${assignment.id}`);
  }
  revalidatePath(`/topics/${data.topicId}`);
  revalidatePath("/");
}
