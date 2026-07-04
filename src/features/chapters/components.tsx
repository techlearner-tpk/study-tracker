import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { saveChapter } from "./actions";

export function ChapterForm({ subjectId }: { subjectId: string }) {
  return (
    <form action={saveChapter} className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
      <input type="hidden" name="subjectId" value={subjectId} />
      <Label>Chapter<Input name="name" required /></Label>
      <Label>Order<Input name="order" type="number" min="0" defaultValue="0" /></Label>
      <Button type="submit" className="self-end">Add</Button>
    </form>
  );
}

