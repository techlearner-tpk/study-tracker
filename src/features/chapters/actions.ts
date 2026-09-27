"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOwnedChapter, getOwnedSubject } from "@/lib/ownership";
import { requireCurrentUser } from "@/lib/auth";
import { chapterSchema, formDataToObject } from "@/lib/validations";
import { invalidateChildDashboardCaches } from "@/lib/cache-tags";

export async function saveChapter(formData: FormData) {
  const user = await requireCurrentUser();
  const data = chapterSchema.parse(formDataToObject(formData));
  const subject = await getOwnedSubject(user.id, data.subjectId);
  if (data.id) {
    const chapter = await getOwnedChapter(user.id, data.id);
    if (chapter.subjectId !== data.subjectId) throw new Error("Chapter and subject mismatch.");
    await prisma.chapter.update({ where: { id: data.id }, data: { name: data.name, order: data.order } });
  } else {
    await prisma.chapter.create({ data: { subjectId: data.subjectId, name: data.name, order: data.order } });
  }
  revalidatePath(`/children/${subject.childId}`);
  revalidatePath("/kid");
  invalidateChildDashboardCaches(subject.childId, subject.child.userId);
}

export async function deleteChapter(formData: FormData) {
  const user = await requireCurrentUser();
  const id = String(formData.get("id"));
  const chapter = await getOwnedChapter(user.id, id);
  const destination = user.role === "KID" ? "/kid" : `/children/${chapter.subject.childId}`;
  try {
    await prisma.chapter.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      const message = "This chapter cannot be deleted because one or more topics are used by an assignment or test paper.";
      redirect(`${destination}?deleteError=${encodeURIComponent(message)}`);
    }
    throw error;
  }
  revalidatePath(`/children/${chapter.subject.childId}`);
  revalidatePath("/kid");
  invalidateChildDashboardCaches(chapter.subject.childId, chapter.subject.child.userId);
}
