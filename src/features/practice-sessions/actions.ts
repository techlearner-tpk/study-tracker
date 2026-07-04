"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOwnedTopic } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";
import { formDataToObject, practiceSessionSchema } from "@/lib/validations";

export async function createPracticeSession(formData: FormData) {
  const user = await requireParentUser();
  const data = practiceSessionSchema.parse(formDataToObject(formData));
  await getOwnedTopic(user.id, data.topicId);
  await prisma.practiceSession.create({ data });
  revalidatePath(`/topics/${data.topicId}`);
  revalidatePath("/");
}
