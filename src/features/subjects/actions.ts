"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOwnedChild, getOwnedSubject } from "@/lib/ownership";
import { requireCurrentUser, requireParentUser } from "@/lib/auth";
import { invalidateChildDashboardCaches } from "@/lib/cache-tags";
import { formDataToObject, subjectSchema } from "@/lib/validations";
import { resolveSubjectColor } from "@/lib/subject-colors";

export async function saveSubject(formData: FormData) {
  const user = await requireCurrentUser();
  const data = subjectSchema.parse(formDataToObject(formData));
  const color = resolveSubjectColor(data.name, data.color);
  if (data.id) {
    const subject = await getOwnedSubject(user.id, data.id);
    await prisma.subject.update({ where: { id: data.id }, data: { name: data.name, color } });
    if (user.role === "PARENT") {
      await prisma.subject.updateMany({
        where: {
          child: { userId: user.id },
          name: { equals: data.name, mode: "insensitive" },
        },
        data: { color },
      });
    }
    revalidatePath(`/children/${subject.childId}`);
    revalidatePath("/kid");
    invalidateChildDashboardCaches(subject.childId, subject.child.userId);
    return;
  } else {
    const child = await getOwnedChild(user.id, data.childId);
    await prisma.subject.create({ data: { childId: data.childId, name: data.name, color } });
    revalidatePath(`/children/${data.childId}`);
    revalidatePath("/kid");
    invalidateChildDashboardCaches(data.childId, child.userId);
  }
}

export async function deleteSubject(formData: FormData) {
  const user = await requireParentUser();
  const id = String(formData.get("id"));
  const subject = await getOwnedSubject(user.id, id);
  await prisma.subject.delete({ where: { id } });
  revalidatePath(`/children/${subject.childId}`);
  invalidateChildDashboardCaches(subject.childId, user.id);
}
