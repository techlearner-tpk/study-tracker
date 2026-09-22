import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { saveChapter } from "./actions";

export function ChapterForm({ subjectId }: { subjectId: string }) {
  return (
    <form action={saveChapter} className="grid min-w-0 gap-3">
      <input type="hidden" name="subjectId" value={subjectId} />
      <Label>Chapter<Input name="name" required /></Label>
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Label>Order<Input name="order" type="number" min="0" defaultValue="0" /></Label>
        <Button type="submit" pendingText="Adding...">Add chapter</Button>
      </div>
    </form>
  );
}
