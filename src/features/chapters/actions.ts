"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOwnedChapter, getOwnedSubject } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";
import { chapterSchema, formDataToObject } from "@/lib/validations";

export async function saveChapter(formData: FormData) {
  const user = await requireParentUser();
  const data = chapterSchema.parse(formDataToObject(formData));
  const subject = await getOwnedSubject(user.id, data.subjectId);
  if (data.id) {
    await getOwnedChapter(user.id, data.id);
    await prisma.chapter.update({ where: { id: data.id }, data: { name: data.name, order: data.order } });
  } else {
    await prisma.chapter.create({ data: { subjectId: data.subjectId, name: data.name, order: data.order } });
  }
  revalidatePath(`/children/${subject.childId}`);
}

export async function deleteChapter(formData: FormData) {
  const user = await requireParentUser();
  const id = String(formData.get("id"));
  const chapter = await getOwnedChapter(user.id, id);
  await prisma.chapter.delete({ where: { id } });
  revalidatePath(`/children/${chapter.subject.childId}`);
}
