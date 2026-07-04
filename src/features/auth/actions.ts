"use server";

import { redirect } from "next/navigation";

export type LoginState = {
  message?: string;
  error?: string;
};

export async function loginAction(): Promise<LoginState> {
  return {
    message: "Use Clerk sign-in at /sign-in.",
  };
}

export async function logoutAction() {
  redirect("/login");
}
