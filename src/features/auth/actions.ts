"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clearAuthCookie, requireCurrentUser, setAuthCookie, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = {
  error?: string;
};

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to sign in" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: "Incorrect email or password" };
  }

  await setAuthCookie({ id: user.id, email: user.email, name: user.name, role: user.role as "PARENT" });
  redirect("/");
}

export async function logoutAction() {
  await requireCurrentUser();
  await clearAuthCookie();
  redirect("/login");
}
