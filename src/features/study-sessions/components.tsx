import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form";
import { createStudySession } from "./actions";

export function StudySessionForm({ topicId }: { topicId: string }) {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 60000).toISOString().slice(0, 16);
  const end = now.toISOString().slice(0, 16);
  return (
    <form action={createStudySession} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="topicId" value={topicId} />
      <Label>Start<Input name="startTime" type="datetime-local" defaultValue={start} required /></Label>
      <Label>End<Input name="endTime" type="datetime-local" defaultValue={end} required /></Label>
      <Label>Duration<Input name="durationMinutes" type="number" min="1" defaultValue="30" required /></Label>
      <Label className="sm:col-span-3">Notes<Textarea name="notes" /></Label>
      <Button type="submit">Log study</Button>
    </form>
  );
}

