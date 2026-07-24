"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (subject?.color) return;
    setColor(resolveSubjectColor(name, color));
  }, [color, name, subject?.color]);

  return (
    <form
      action={saveSubject}
      className={subject ? "grid gap-4 rounded-md border border-stone-200 bg-stone-50 p-4" : "grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] lg:items-end"}
    >
      {subject ? <input type="hidden" name="id" value={subject.id} /> : null}
      <input type="hidden" name="childId" value={childId} />
      <Label>
        Subject
        <Input name="name" value={name} onChange={(event) => setName(event.target.value)} required />
      </Label>
      <ColorSwatchField
        label="Subject color"
        name="color"
        value={color}
        options={colorChoices}
        helperText="The same subject name keeps the same color across this family."
        onChange={setColor}
      />
      <div className={subject ? "" : "pb-0.5"}>
        <Button type="submit">{subject ? "Save subject" : "Add subject"}</Button>
      </div>
    </form>
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
