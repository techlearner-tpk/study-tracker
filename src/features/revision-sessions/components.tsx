import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { createRevisionSession } from "./actions";

export function RevisionSessionForm({ topicId, assignmentId }: { topicId: string; assignmentId?: string }) {
  return (
    <form action={createRevisionSession} className="grid gap-3 sm:grid-cols-[180px_160px_1fr_auto]">
      <input type="hidden" name="topicId" value={topicId} />
      {assignmentId ? <input type="hidden" name="assignmentId" value={assignmentId} /> : null}
      <Label>Date<Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Label>
      <Label>Minutes<Input name="durationMinutes" type="number" min="1" defaultValue="15" required /></Label>
      <Label>Notes<Input name="notes" /></Label>
      <Button type="submit" className="self-end">Log revision</Button>
    </form>
  );
}
