"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ColorSwatchField } from "@/components/ui/color-swatch-field";
import { Input, Label } from "@/components/ui/form";
import { CurriculumPicker } from "@/features/curriculum/picker";
import type { CurriculumTreeVersion } from "@/features/curriculum/service";
import { childThemeChoices, resolveChildThemeColor } from "@/lib/subject-colors";
import { createChild, deleteChild, inviteKid, resendKidInvitation, updateChild } from "./actions";

export function ChildForm({
  child,
  showKidEmail = false,
  curricula = [],
}: {
  child?: { id: string; name: string; school: string | null; themeColor: string | null; kidUser?: { email: string; clerkUserId?: string | null } | null };
  showKidEmail?: boolean;
  curricula?: CurriculumTreeVersion[];
}) {
  const [themeColor, setThemeColor] = useState(resolveChildThemeColor(child?.themeColor));

  return (
    <form action={child ? updateChild : createChild} className="grid gap-4 sm:grid-cols-2">
      {child ? <input type="hidden" name="id" value={child.id} /> : null}
      <Label>Name<Input name="name" defaultValue={child?.name} required /></Label>
      {!child && curricula.length ? (
        <div className="sm:col-span-2">
          <CurriculumPicker curricula={curricula} />
        </div>
      ) : null}
      <Label>School<Input name="school" defaultValue={child?.school ?? ""} /></Label>
      <ColorSwatchField
        label="Theme color"
        name="themeColor"
        value={themeColor}
        options={childThemeChoices}
        helperText="Child colors stay separate from subject colors so the two cues do not collide."
        onChange={setThemeColor}
      />
      {showKidEmail ? (
        <Label className="sm:col-span-2">
          Kid email
          <Input
            name="kidEmail"
            type="email"
            defaultValue={child?.kidUser?.email ?? ""}
            placeholder="kid@example.com"
            readOnly={Boolean(child?.kidUser?.clerkUserId)}
            aria-readonly={Boolean(child?.kidUser?.clerkUserId)}
            className={child?.kidUser?.clerkUserId ? "cursor-not-allowed bg-slate-100 text-slate-600" : undefined}
          />
          {child && !child.kidUser ? <span className="mt-1 block text-xs text-slate-500">Add an email later to send the child a Clerk sign-up invitation.</span> : null}
          {child?.kidUser && !child.kidUser.clerkUserId ? <span className="mt-1 block text-xs text-amber-700">Invitation pending. You can resend it if the previous email expired or had the wrong link.</span> : null}
          {child?.kidUser?.clerkUserId ? <span className="mt-1 block text-xs text-emerald-700">Kid account is active. The sign-in email can no longer be changed here.</span> : null}
        </Label>
      ) : null}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" pendingText={child ? "Saving..." : "Adding..."}>{child ? "Save child" : "Add child"}</Button>
        {child?.kidUser ? (
          <Button
            type="submit"
            formAction={resendKidInvitation}
            variant="secondary"
            pendingText="Resending..."
            disabled={Boolean(child.kidUser.clerkUserId)}
          >
            {child.kidUser.clerkUserId ? "Kid signed up" : "Resend invite"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function DangerDeleteChild({ child, errorMessage }: { child: { id: string; name: string }; errorMessage?: string | null }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardTitle className="text-red-900">Delete child</CardTitle>
      <p className="mt-2 text-sm text-red-800">This permanently deletes {child.name}, including all subjects, chapters, topics, goals, and sessions.</p>
      {errorMessage ? <p className="mt-3 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-800">{errorMessage}</p> : null}
      <form action={deleteChild} className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <input type="hidden" name="childId" value={child.id} />
        <input type="hidden" name="childName" value={child.name} />
        <Label className="text-red-900">Type {child.name} to confirm<Input name="confirmation" required /></Label>
        <Button type="submit" variant="danger">Delete</Button>
      </form>
    </Card>
  );
}

export function KidInviteForm({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={compact ? "border-0 bg-transparent p-0 shadow-none" : ""}>
      {!compact ? <CardTitle>Invite kid by email</CardTitle> : null}
      <form action={inviteKid} className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Label className="sm:col-span-1">
          Kid email
          <Input name="kidEmail" type="email" placeholder="kid@example.com" required />
        </Label>
        <Button type="submit">
          Send invite
        </Button>
      </form>
    </Card>
  );
}
