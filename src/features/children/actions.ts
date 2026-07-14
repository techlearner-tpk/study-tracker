"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnedChild } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";
import { childSchema, deleteChildSchema, formDataToObject } from "@/lib/validations";
import { defaultSubjects } from "@/features/subjects/constants";
import { clerkClient } from "@clerk/nextjs/server";
import { appUrl } from "@/lib/app-url";
import { loadCurriculumVersionTree, snapshotCurriculumToChild } from "@/features/curriculum/service";

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
      subjects: {
        create: defaultSubjects.map((name, index) => ({
          name,
          order: index + 1,
        })),
      },
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

  const client = await clerkClient();
  await client.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${appUrl()}/sign-up`,
    ignoreExisting: true,
    publicMetadata: {
      role: "KID",
      childId: child.id,
      childName: child.name,
    },
  });

  revalidatePath("/");
}

export async function createChild(formData: FormData) {
  const user = await requireParentUser();
  const data = childSchema.parse(formDataToObject(formData));
  const curriculumVersionId = String(formData.get("curriculumVersionId") ?? "").trim();
  const curriculumClassId = String(formData.get("curriculumClassId") ?? "").trim();
  const selectedSubjectIds = formData.getAll("selectedSubjectIds").map(String).filter(Boolean);
  const usingCurriculum = Boolean(curriculumVersionId && curriculumClassId);

  if (usingCurriculum && selectedSubjectIds.length === 0) {
    throw new Error("Select at least one subject");
  }

  const curriculumVersion = usingCurriculum ? await loadCurriculumVersionTree(curriculumVersionId) : null;
  if (usingCurriculum && !curriculumVersion) {
    throw new Error("Choose a published curriculum version");
  }

  const child = await prisma.$transaction(async (tx) => {
    const createdChild = await tx.child.create({
      data: {
        userId: user.id,
        name: data.name,
        className: data.className,
        school: data.school,
        themeColor: data.themeColor,
      },
    });

    if (data.kidEmail) {
      const email = data.kidEmail.toLowerCase();
      await tx.user.upsert({
        where: { email },
        update: {
          role: "KID",
          childId: createdChild.id,
          name: displayNameFromEmail(email),
        },
        create: {
          email,
          name: displayNameFromEmail(email),
          role: "KID",
          childId: createdChild.id,
          verifiedAt: null,
          passwordHash: "clerk-pending-kid-account",
        },
      });
    }

    if (!usingCurriculum) {
      await tx.subject.createMany({
        data: defaultSubjects.map((name, index) => ({
          childId: createdChild.id,
          name,
          order: index + 1,
        })),
      });
    }

    return createdChild;
  });

  if (usingCurriculum) {
    await snapshotCurriculumToChild(
      prisma,
      {
        childId: child.id,
        curriculumVersionId,
        curriculumClassId,
        selectedSubjectIds,
      },
      curriculumVersion,
    );
  }

  if (data.kidEmail) {
    const email = data.kidEmail.toLowerCase();
    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${appUrl()}/sign-up`,
      ignoreExisting: true,
      publicMetadata: {
        role: "KID",
        childId: child.id,
        childName: child.name,
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
  const raw = formDataToObject(formData);
  const childId = String(raw.childId ?? "").trim();
  let data: { childId: string; childName: string; confirmation: string };
  try {
    data = deleteChildSchema.parse(raw);
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message ?? "Unable to delete child"
        : error instanceof Error
          ? error.message
          : "Unable to delete child";
    redirect(childId ? `/children/${childId}?deleteError=${encodeURIComponent(message)}` : `/?deleteError=${encodeURIComponent(message)}`);
  }

  const child = await getOwnedChild(user.id, data.childId);
  const clerkUserId = child.kidUser?.clerkUserId;

  await prisma.child.delete({ where: { id: data.childId } });

  if (clerkUserId) {
    const client = await clerkClient();
    await client.users.deleteUser(clerkUserId);
  }

  revalidatePath("/");
  redirect("/");
}
