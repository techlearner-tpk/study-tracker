"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ColorSwatchField } from "@/components/ui/color-swatch-field";
import { Input, Label } from "@/components/ui/form";
import { CurriculumPicker } from "@/features/curriculum/picker";
import type { CurriculumTreeVersion } from "@/features/curriculum/service";
import { childThemeChoices, resolveChildThemeColor } from "@/lib/subject-colors";
import { createChild, deleteChild, inviteKid, updateChild } from "./actions";

export function ChildForm({
  child,
  showKidEmail = false,
  curricula = [],
}: {
  child?: { id: string; name: string; className: string; school: string | null; themeColor: string | null };
  showKidEmail?: boolean;
  curricula?: CurriculumTreeVersion[];
}) {
  const [className, setClassName] = useState(child?.className ?? curricula[0]?.classes[0]?.name ?? "");
  const [themeColor, setThemeColor] = useState(resolveChildThemeColor(child?.themeColor));

  return (
    <form action={child ? updateChild : createChild} className="grid gap-4 sm:grid-cols-2">
      {child ? <input type="hidden" name="id" value={child.id} /> : null}
      <Label>Name<Input name="name" defaultValue={child?.name} required /></Label>
      {curricula.length ? (
        <div className="sm:col-span-2">
          <CurriculumPicker curricula={curricula} className={className} onClassNameChange={setClassName} />
        </div>
      ) : (
        <Label>Class<Input name="className" value={className} onChange={(event) => setClassName(event.target.value)} required /></Label>
      )}
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
        <Label className="sm:col-span-2">Kid email<Input name="kidEmail" type="email" placeholder="kid@example.com" /></Label>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit">{child ? "Save child" : "Add child"}</Button>
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

export function KidInviteForm() {
  return (
    <Card>
      <CardTitle>Invite kid by email</CardTitle>
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
