import { redirect } from "next/navigation";
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

function displayNameFromEmail(email: string) {
  return email.split("@")[0].replace(/[._-]+/g, " ");
}

const placeholderPasswordHash = "clerk-managed-account";

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

  const select = {
    id: true,
    email: true,
    name: true,
    role: true,
    childId: true,
    clerkUserId: true,
    verifiedAt: true,
  } as const;

  const existingByClerkId = await prisma.user.findUnique({
    where: { clerkUserId: profile.clerkUserId },
    select,
  });

  const existingByEmail =
    existingByClerkId ??
    (await prisma.user.findUnique({
      where: { email: profile.email },
      select,
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
      select,
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
    select,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const user = await upsertCurrentUser();
  if (!user || !user.verifiedAt) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    childId: user.childId,
  };
}

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

export async function requireKidUser() {
  const user = await requireCurrentUser();
  if (user.role !== "KID") {
    redirect("/");
  }
  return user;
}
