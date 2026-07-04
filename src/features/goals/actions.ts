"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOwnedChild, getOwnedChapter, getOwnedTopic } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";
import { formDataToObject, habitGoalSchema, outcomeGoalSchema } from "@/lib/validations";

export async function createHabitGoal(formData: FormData) {
  const user = await requireParentUser();
  const data = habitGoalSchema.parse(formDataToObject(formData));
  await getOwnedChild(user.id, data.childId);
  await prisma.habitGoal.create({ data });
  revalidatePath(`/children/${data.childId}`);
}

export async function createOutcomeGoal(formData: FormData) {
  const user = await requireParentUser();
  const data = outcomeGoalSchema.parse(formDataToObject(formData));
  await getOwnedChild(user.id, data.childId);
  if (data.type === "COMPLETE_TOPIC" && data.targetTopicId) {
    await getOwnedTopic(user.id, data.targetTopicId);
  }
  if (data.type === "COMPLETE_CHAPTER" && data.targetChapterId) {
    await getOwnedChapter(user.id, data.targetChapterId);
  }
  await prisma.outcomeGoal.create({ data });
  revalidatePath(`/children/${data.childId}`);
}
