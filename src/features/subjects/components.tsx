"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorSwatchField } from "@/components/ui/color-swatch-field";
import { Input, Label } from "@/components/ui/form";
import { resolveSubjectColor, subjectColorChoicesForChildTheme } from "@/lib/subject-colors";
import { deleteSubject, saveSubject } from "./actions";

export function SubjectForm({
  childId,
  childThemeColor,
  subject,
}: {
  childId: string;
  childThemeColor?: string | null;
  subject?: { id: string; name: string; color: string | null };
}) {
  const [name, setName] = useState(subject?.name ?? "");
  const [color, setColor] = useState(resolveSubjectColor(subject?.name ?? "", subject?.color));
  const colorChoices = subjectColorChoicesForChildTheme(childThemeColor);

  function updateName(nextName: string) {
    setName(nextName);
    if (!subject?.color) setColor(resolveSubjectColor(nextName));
  }

  return (
    <form
      action={saveSubject}
      className={subject ? "grid gap-4 rounded-md border border-stone-200 bg-stone-50 p-4" : "grid gap-4"}
    >
      {subject ? <input type="hidden" name="id" value={subject.id} /> : null}
      <input type="hidden" name="childId" value={childId} />
      <Label>
        Subject
        <Input name="name" value={name} onChange={(event) => updateName(event.target.value)} required />
      </Label>
      <ColorSwatchField
        label="Subject color"
        name="color"
        value={color}
        options={colorChoices}
        helperText="The same subject name keeps the same color across this family."
        onChange={setColor}
        compact={!subject}
      />
      <div>
        <Button type="submit" className={subject ? "" : "w-full"}>{subject ? "Save subject" : "Add subject"}</Button>
      </div>
    </form>
  );
}

export function AddSubjectCard({
  childId,
  childThemeColor,
}: {
  childId: string;
  childThemeColor?: string | null;
}) {
  return (
    <details className="group min-h-32 rounded-lg border border-dashed border-slate-300 bg-slate-50/40 open:col-span-full open:bg-white">
      <summary className="flex min-h-32 cursor-pointer list-none items-center gap-3 p-4 text-left marker:hidden">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-700 shadow-sm">
          <Plus size={20} aria-hidden="true" />
        </span>
        <span>
          <span className="block font-semibold text-slate-950">Add subject</span>
          <span className="mt-1 block text-sm text-slate-600">Add school, Olympiad, hobby, or personal learning.</span>
        </span>
      </summary>
      <div className="border-t border-slate-200 p-4">
        <div className="max-w-xl">
          <SubjectForm childId={childId} childThemeColor={childThemeColor} />
        </div>
      </div>
    </details>
  );
}

export function DeleteSubjectButton({ id, childId }: { id: string; childId: string }) {
  return (
    <form action={deleteSubject}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="childId" value={childId} />
      <Button type="submit" variant="ghost">Delete</Button>
    </form>
  );
}
