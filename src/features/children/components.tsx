import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { createChild, deleteChild, updateChild } from "./actions";

export function ChildForm({ child }: { child?: { id: string; name: string; className: string; school: string | null; themeColor: string | null } }) {
  return (
    <form action={child ? updateChild : createChild} className="grid gap-3 sm:grid-cols-2">
      {child ? <input type="hidden" name="id" value={child.id} /> : null}
      <Label>Name<Input name="name" defaultValue={child?.name} required /></Label>
      <Label>Class<Input name="className" defaultValue={child?.className} required /></Label>
      <Label>School<Input name="school" defaultValue={child?.school ?? ""} /></Label>
      <Label>Theme color<Input name="themeColor" type="color" defaultValue={child?.themeColor ?? "#4f766a"} /></Label>
      <div className="sm:col-span-2">
        <Button type="submit">{child ? "Save child" : "Add child"}</Button>
      </div>
    </form>
  );
}

export function DangerDeleteChild({ child }: { child: { id: string; name: string } }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardTitle className="text-red-900">Delete child</CardTitle>
      <p className="mt-2 text-sm text-red-800">This permanently deletes {child.name}, including all subjects, chapters, topics, goals, and sessions.</p>
      <form action={deleteChild} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input type="hidden" name="childId" value={child.id} />
        <input type="hidden" name="childName" value={child.name} />
        <Label className="text-red-900">Type {child.name} to confirm<Input name="confirmation" required /></Label>
        <Button type="submit" variant="danger" className="self-end">Delete</Button>
      </form>
    </Card>
  );
}

