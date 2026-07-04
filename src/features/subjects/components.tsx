import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { saveSubject, deleteSubject } from "./actions";

export function SubjectForm({ childId }: { childId: string }) {
  return (
    <form action={saveSubject} className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
      <input type="hidden" name="childId" value={childId} />
      <Label>Subject<Input name="name" required /></Label>
      <Label>Color<Input name="color" type="color" defaultValue="#4f766a" /></Label>
      <Button type="submit" className="self-end">Add</Button>
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

