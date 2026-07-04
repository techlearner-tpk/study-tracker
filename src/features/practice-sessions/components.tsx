import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form";
import { createPracticeSession } from "./actions";

export function PracticeSessionForm({ topicId }: { topicId: string }) {
  return (
    <form action={createPracticeSession} className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="topicId" value={topicId} />
      <Label>Date<Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Label>
      <Label>Minutes<Input name="durationMinutes" type="number" min="1" defaultValue="20" required /></Label>
      <Label>Attempted<Input name="questionsAttempted" type="number" min="0" /></Label>
      <Label>Correct<Input name="questionsCorrect" type="number" min="0" /></Label>
      <Label className="sm:col-span-4">Notes<Textarea name="notes" /></Label>
      <Button type="submit">Log practice</Button>
    </form>
  );
}

