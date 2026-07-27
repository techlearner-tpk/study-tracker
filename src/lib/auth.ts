import { redirect } from "next/navigation";
import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  childId: string | null;
};

const adminEmails = new Set(
  [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

function displayNameFromEmail(email: string) {
  return email.split("@")[0].replace(/[._-]+/g, " ");
}

const placeholderPasswordHash = "clerk-managed-account";

const currentUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  childId: true,
  clerkUserId: true,
  verifiedAt: true,
} as const;

function displayNameFromClerkUser(user: Awaited<ReturnType<typeof currentUser>>) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
}

async function getVerifiedClerkProfile() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const primaryEmail =
    clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId) ??
    clerkUser.emailAddresses[0];

  if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
    return null;
  }

  const email = primaryEmail.emailAddress.toLowerCase();
  const name = displayNameFromClerkUser(clerkUser) || displayNameFromEmail(email);
  const publicMetadata = clerkUser.publicMetadata as Record<string, unknown> | undefined;
  const role: UserRole = publicMetadata?.role === "KID" ? "KID" : "PARENT";
  const childId = typeof publicMetadata?.childId === "string" ? publicMetadata.childId : null;

  return { clerkUserId: clerkUser.id, email, name, role, childId };
}

async function upsertCurrentUser() {
  const profile = await getVerifiedClerkProfile();
  if (!profile) return null;

  const existingByClerkId = await prisma.user.findUnique({
    where: { clerkUserId: profile.clerkUserId },
    select: currentUserSelect,
  });

  const existingByEmail =
    existingByClerkId ??
    (await prisma.user.findUnique({
      where: { email: profile.email },
      select: currentUserSelect,
    }));

  const mergedRole: UserRole =
    profile.role === "KID" || existingByEmail?.role === "KID" ? "KID" : "PARENT";

  const resolvedChildId =
    (profile.role === "KID" ? profile.childId : null) ??
    (existingByEmail?.role === "KID" ? existingByEmail.childId : null);

  const verifiedChildId =
    resolvedChildId && mergedRole === "KID"
      ? (await prisma.child.findUnique({ where: { id: resolvedChildId }, select: { id: true } }))?.id ?? null
      : null;

  if (!existingByEmail) {
    return prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        role: mergedRole,
        clerkUserId: profile.clerkUserId,
        verifiedAt: new Date(),
        passwordHash: placeholderPasswordHash,
        childId: verifiedChildId,
      },
      select: currentUserSelect,
    });
  }

  const needsUpdate =
    existingByEmail.clerkUserId !== profile.clerkUserId ||
    existingByEmail.email !== profile.email ||
    existingByEmail.name !== profile.name ||
    existingByEmail.role !== mergedRole ||
    existingByEmail.childId !== verifiedChildId ||
    !existingByEmail.verifiedAt;

  if (!needsUpdate) {
    return existingByEmail;
  }

  return prisma.user.update({
    where: { id: existingByEmail.id },
    data: {
      email: profile.email,
      name: profile.name,
      role: mergedRole,
      clerkUserId: profile.clerkUserId,
      verifiedAt: existingByEmail.verifiedAt ?? new Date(),
      childId: verifiedChildId,
    },
    select: currentUserSelect,
  });
}

export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const localUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: currentUserSelect,
  });

  const user = localUser?.verifiedAt ? localUser : await upsertCurrentUser();
  if (!user || !user.verifiedAt) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    childId: user.childId,
  };
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireParentUser() {
  const user = await requireCurrentUser();
  if (user.role !== "PARENT") {
    redirect("/kid");
  }
  return user;
}

export function isAdminUser(user: Pick<CurrentUser, "email" | "role">) {
  return user.role === "PARENT" && adminEmails.has(user.email.toLowerCase());
}

export async function requireAdminUser() {
  const user = await requireParentUser();
  if (!isAdminUser(user)) {
    redirect("/");
  }
  return user;
}

export async function requireKidUser() {
  const user = await requireCurrentUser();
  if (user.role !== "KID") {
    redirect("/");
  }
  return user;
}
