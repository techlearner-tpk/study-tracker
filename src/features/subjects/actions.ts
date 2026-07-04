"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOwnedChild, getOwnedSubject } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";
import { formDataToObject, subjectSchema } from "@/lib/validations";

export async function saveSubject(formData: FormData) {
  const user = await requireParentUser();
  const data = subjectSchema.parse(formDataToObject(formData));
  if (data.id) {
    const subject = await getOwnedSubject(user.id, data.id);
    await prisma.subject.update({ where: { id: data.id }, data: { name: data.name, color: data.color } });
    revalidatePath(`/children/${subject.childId}`);
    return;
  } else {
    await getOwnedChild(user.id, data.childId);
    await prisma.subject.create({ data: { childId: data.childId, name: data.name, color: data.color } });
  }
  revalidatePath(`/children/${data.childId}`);
}

export async function deleteSubject(formData: FormData) {
  const user = await requireParentUser();
  const id = String(formData.get("id"));
  const subject = await getOwnedSubject(user.id, id);
  await prisma.subject.delete({ where: { id } });
  revalidatePath(`/children/${subject.childId}`);
}
