"use server";

import { LearningStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOwnedChapter, getOwnedTopic } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";
import { formDataToObject, topicSchema } from "@/lib/validations";

export async function saveTopic(formData: FormData) {
  const user = await requireParentUser();
  const data = topicSchema.parse(formDataToObject(formData));
  const chapter = await getOwnedChapter(user.id, data.chapterId);
  const payload = {
    name: data.name,
    description: data.description,
    status: data.status as LearningStatus,
    confidenceRating: data.confidenceRating,
    notes: data.notes,
    completedAt: data.status === "COMPLETED" ? new Date() : null,
  };

  if (data.id) {
    await getOwnedTopic(user.id, data.id);
  }
  const topic = data.id
    ? await prisma.topic.update({ where: { id: data.id }, data: payload })
    : await prisma.topic.create({ data: { ...payload, chapterId: data.chapterId } });

  revalidatePath(`/children/${chapter.subject.childId}`);
  revalidatePath(`/topics/${topic.id}`);
}

export async function deleteTopic(formData: FormData) {
  const user = await requireParentUser();
  const id = String(formData.get("id"));
  const topic = await getOwnedTopic(user.id, id);
  await prisma.topic.delete({ where: { id } });
  revalidatePath(`/children/${topic.chapter.subject.childId}`);
  redirect(`/children/${topic.chapter.subject.childId}`);
}
