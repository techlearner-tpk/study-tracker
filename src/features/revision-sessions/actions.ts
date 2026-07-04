"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOwnedTopic } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";
import { formDataToObject, revisionSessionSchema } from "@/lib/validations";

export async function createRevisionSession(formData: FormData) {
  const user = await requireParentUser();
  const data = revisionSessionSchema.parse(formDataToObject(formData));
  await getOwnedTopic(user.id, data.topicId);
  await prisma.revisionSession.create({ data });
  revalidatePath(`/topics/${data.topicId}`);
  revalidatePath("/");
}
