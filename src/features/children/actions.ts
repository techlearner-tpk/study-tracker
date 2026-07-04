"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOwnedChild } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";
import { childSchema, deleteChildSchema, formDataToObject } from "@/lib/validations";
import { defaultSubjects } from "@/features/subjects/constants";

const displayNameFromEmail = (email: string) => email.split("@")[0].replace(/[._-]+/g, " ");

export async function inviteKid(formData: FormData) {
  const parent = await requireParentUser();
  const email = String(formData.get("kidEmail") ?? "").trim().toLowerCase();
  if (!email) {
    throw new Error("Kid email is required");
  }

  const child = await prisma.child.create({
    data: {
      userId: parent.id,
      name: displayNameFromEmail(email),
      className: "Not set",
      subjects: { create: defaultSubjects.map((name) => ({ name })) },
    },
  });

  await prisma.user.upsert({
    where: { email },
    update: {
      role: "KID",
      childId: child.id,
      name: displayNameFromEmail(email),
    },
    create: {
      email,
      name: displayNameFromEmail(email),
      role: "KID",
      childId: child.id,
      verifiedAt: null,
      passwordHash: "clerk-pending-kid-account",
    },
  });

  revalidatePath("/");
}

export async function createChild(formData: FormData) {
  const user = await requireParentUser();
  const data = childSchema.parse(formDataToObject(formData));
  const child = await prisma.child.create({
    data: {
      userId: user.id,
      name: data.name,
      className: data.className,
      school: data.school,
      themeColor: data.themeColor,
      subjects: { create: defaultSubjects.map((name) => ({ name })) },
    },
  });

  if (data.kidEmail) {
    const email = data.kidEmail.toLowerCase();
    await prisma.user.upsert({
      where: { email },
      update: {
        role: "KID",
        childId: child.id,
        name: displayNameFromEmail(email),
      },
      create: {
        email,
        name: displayNameFromEmail(email),
        role: "KID",
        childId: child.id,
        verifiedAt: null,
        passwordHash: "clerk-pending-kid-account",
      },
    });
  }

  revalidatePath("/");
  redirect(`/children/${child.id}`);
}

export async function updateChild(formData: FormData) {
  const user = await requireParentUser();
  const data = childSchema.required({ id: true }).parse(formDataToObject(formData));
  await getOwnedChild(user.id, data.id);
  await prisma.child.update({
    where: { id: data.id },
    data: {
      name: data.name,
      className: data.className,
      school: data.school,
      themeColor: data.themeColor,
    },
  });
  revalidatePath(`/children/${data.id}`);
}

export async function deleteChild(formData: FormData) {
  const user = await requireParentUser();
  const data = deleteChildSchema.parse(formDataToObject(formData));
  await getOwnedChild(user.id, data.childId);
  await prisma.child.delete({ where: { id: data.childId } });
  revalidatePath("/");
  redirect("/");
}
