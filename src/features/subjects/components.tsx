import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { saveSubject, deleteSubject } from "./actions";

export function SubjectForm({ childId }: { childId: string }) {
  return (
    <form action={saveSubject} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
      <input type="hidden" name="childId" value={childId} />
      <Label>Subject<Input name="name" required /></Label>
      <Label>Color<Input name="color" type="color" defaultValue="#4f766a" className="w-16 px-1" /></Label>
      <Button type="submit">Add</Button>
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
