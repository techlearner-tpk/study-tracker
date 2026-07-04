"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOwnedTopic } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";
import { formDataToObject, studySessionSchema } from "@/lib/validations";

export async function createStudySession(formData: FormData) {
  const user = await requireParentUser();
  const data = studySessionSchema.parse(formDataToObject(formData));
  await getOwnedTopic(user.id, data.topicId);
  await prisma.studySession.create({ data });
  await prisma.topic.update({ where: { id: data.topicId }, data: { status: "IN_PROGRESS" } });
  revalidatePath(`/topics/${data.topicId}`);
  revalidatePath("/");
}
