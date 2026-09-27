import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input, Label } from "@/components/ui/form";
import { deleteChapter, saveChapter } from "./actions";

type EditableChapter = { id: string; name: string; order: number };

export function ChapterForm({ subjectId, chapter }: { subjectId: string; chapter?: EditableChapter }) {
  return (
    <form action={saveChapter} className="grid min-w-0 gap-3">
      {chapter ? <input type="hidden" name="id" value={chapter.id} /> : null}
      <input type="hidden" name="subjectId" value={subjectId} />
      <Label>Chapter<Input name="name" defaultValue={chapter?.name} required /></Label>
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Label>Order<Input name="order" type="number" min="0" defaultValue={chapter?.order ?? 0} /></Label>
        <Button type="submit" pendingText={chapter ? "Saving..." : "Adding..."}>{chapter ? "Save chapter" : "Add chapter"}</Button>
      </div>
    </form>
  );
}

export function DeleteChapterButton({ chapter }: { chapter: Pick<EditableChapter, "id" | "name"> }) {
  return (
    <form action={deleteChapter}>
      <input type="hidden" name="id" value={chapter.id} />
      <ConfirmSubmitButton
        confirmationMessage={`Delete chapter "${chapter.name}" and all topics inside it?`}
        variant="danger"
        pendingText="Deleting..."
      >
        Delete chapter
      </ConfirmSubmitButton>
    </form>
  );
}
