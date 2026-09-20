"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnedChild } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";
import { childSchema, deleteChildSchema, formDataToObject } from "@/lib/validations";
import { invalidateChildDashboardCaches, invalidateParentDashboardCaches } from "@/lib/cache-tags";
import { defaultSubjects } from "@/features/subjects/constants";
import { clerkClient } from "@clerk/nextjs/server";
import { appUrl } from "@/lib/app-url";
import { loadCurriculumVersionTree, snapshotCurriculumToChild } from "@/features/curriculum/service";
import { resolveChildThemeColor, resolveSubjectColor } from "@/lib/subject-colors";

const displayNameFromEmail = (email: string) => email.split("@")[0].replace(/[._-]+/g, " ");

async function sendKidInvitation(
  email: string,
  child: { id: string; name: string },
  options: { replacePending?: boolean } = {},
) {
  const client = await clerkClient();
  const previousInvitations = options.replacePending
    ? await client.invitations.getInvitationList({ query: email, status: "pending" })
    : null;

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

  if (previousInvitations) {
    const matchingInvitations = previousInvitations.data.filter(
      (invitation) => invitation.emailAddress.toLowerCase() === email.toLowerCase(),
    );
    await Promise.allSettled(
      matchingInvitations.map((invitation) => client.invitations.revokeInvitation(invitation.id)),
    );
  }
}

export async function inviteKid(formData: FormData) {
  const parent = await requireParentUser();
  const email = String(formData.get("kidEmail") ?? "").trim().toLowerCase();
  if (!email) {
    redirect("/?inviteError=Kid%20email%20is%20required");
  }

  try {
    const child = await prisma.child.create({
      data: {
        userId: parent.id,
        name: displayNameFromEmail(email),
        className: "Not set",
        subjects: {
          create: defaultSubjects.map((name, index) => ({
            name,
            color: resolveSubjectColor(name),
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

    await sendKidInvitation(email, child);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send invite";
    redirect(`/?inviteError=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  invalidateParentDashboardCaches(parent.id);
  redirect("/?inviteStatus=sent");
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

  const duplicateChild = await prisma.child.findFirst({
    where: {
      userId: user.id,
      name: { equals: data.name.trim(), mode: "insensitive" },
      className: { equals: data.className.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicateChild) {
    redirect(`/?childError=${encodeURIComponent("That child already exists. Open the existing child instead of adding it again.")}`);
  }

  const child = await prisma.$transaction(async (tx) => {
    const createdChild = await tx.child.create({
      data: {
        userId: user.id,
        name: data.name,
        className: data.className,
        school: data.school,
        themeColor: resolveChildThemeColor(data.themeColor),
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
          color: resolveSubjectColor(name),
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
    await sendKidInvitation(email, child);
  }

  revalidatePath("/");
  invalidateParentDashboardCaches(user.id);
  invalidateChildDashboardCaches(child.id, user.id);
  redirect(`/children/${child.id}?created=1`);
}

export async function updateChild(formData: FormData) {
  const user = await requireParentUser();
  const data = childSchema.required({ id: true }).parse(formDataToObject(formData));
  const existingChild = await getOwnedChild(user.id, data.id);
  const email = data.kidEmail?.toLowerCase();

  if (email && existingChild.kidUser && email !== existingChild.kidUser.email.toLowerCase()) {
    redirect(`/children/${data.id}?updateError=${encodeURIComponent("This child already has a linked kid account. Remove or change the email from Clerk before using another address.")}`);
  }

  if (email && !existingChild.kidUser) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, childId: true, role: true },
    });

    if (existingUser?.childId && existingUser.childId !== data.id) {
      redirect(`/children/${data.id}?updateError=${encodeURIComponent("That email is already linked to another child.")}`);
    }
    if (existingUser?.role === "PARENT" && !existingUser.childId) {
      redirect(`/children/${data.id}?updateError=${encodeURIComponent("That email is already used by a parent account.")}`);
    }
  }

  await prisma.child.update({
    where: { id: data.id },
    data: {
      name: data.name,
      className: data.className,
      school: data.school,
      themeColor: resolveChildThemeColor(data.themeColor),
    },
  });

  if (email && !existingChild.kidUser) {
    await prisma.user.upsert({
      where: { email },
      update: {
        role: "KID",
        childId: data.id,
        name: displayNameFromEmail(email),
      },
      create: {
        email,
        name: displayNameFromEmail(email),
        role: "KID",
        childId: data.id,
        verifiedAt: null,
        passwordHash: "clerk-pending-kid-account",
      },
    });

    try {
      await sendKidInvitation(email, { id: data.id, name: data.name });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send kid invitation";
      redirect(`/children/${data.id}?updateError=${encodeURIComponent(message)}`);
    }

    revalidatePath(`/children/${data.id}`);
    invalidateChildDashboardCaches(data.id, user.id);
    redirect(`/children/${data.id}?updateStatus=invite-sent`);
  }

  revalidatePath(`/children/${data.id}`);
  invalidateChildDashboardCaches(data.id, user.id);
}

export async function resendKidInvitation(formData: FormData) {
  const user = await requireParentUser();
  const childId = String(formData.get("id") ?? "").trim();
  if (!childId) {
    redirect("/?inviteError=Child%20is%20required");
  }

  const child = await getOwnedChild(user.id, childId);
  if (!child.kidUser?.email) {
    redirect(`/children/${childId}?updateError=${encodeURIComponent("Add a kid email before sending an invitation.")}`);
  }
  if (child.kidUser.clerkUserId) {
    redirect(`/children/${childId}?updateError=${encodeURIComponent("This kid has already signed up, so an invitation cannot be resent.")}`);
  }

  try {
    await sendKidInvitation(child.kidUser.email, child, { replacePending: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resend kid invitation";
    redirect(`/children/${childId}?updateError=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/children/${childId}`);
  invalidateChildDashboardCaches(childId, user.id);
  redirect(`/children/${childId}?updateStatus=invite-resent`);
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
  invalidateParentDashboardCaches(user.id);
  invalidateChildDashboardCaches(data.childId, user.id);
  redirect("/?deleteStatus=deleted");
}
