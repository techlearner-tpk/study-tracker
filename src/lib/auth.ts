import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionToken, verifySessionToken, type CurrentUser } from "@/lib/security";

export const AUTH_COOKIE_NAME = "study-tracker-session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "PARENT",
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
    redirect("/login");
  }
  return user;
}

export async function setAuthCookie(user: CurrentUser) {
  (await cookies()).set(AUTH_COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearAuthCookie() {
  (await cookies()).set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export { createSessionToken, verifySessionToken, hashPassword, verifyPassword } from "@/lib/security";
