"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <Label>
        Email
        <Input name="email" type="email" autoComplete="email" required defaultValue="parent@studytracker.local" />
      </Label>
      <Label>
        Password
        <Input name="password" type="password" autoComplete="current-password" required />
      </Label>
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
