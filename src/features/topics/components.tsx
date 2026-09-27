import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { deleteTopic, saveTopic } from "./actions";

export type EditableTopic = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  confidenceRating: number | null;
  notes: string | null;
};

export function TopicForm({ chapterId, returnTo, topic }: { chapterId: string; returnTo?: string; topic?: EditableTopic }) {
  return (
    <form action={saveTopic} className="grid gap-3">
      {topic ? <input type="hidden" name="id" value={topic.id} /> : null}
      <input type="hidden" name="chapterId" value={chapterId} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <Label>Topic<Input name="name" defaultValue={topic?.name} required /></Label>
      <Label>Description<Textarea name="description" defaultValue={topic?.description ?? ""} /></Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label>Status
          <Select name="status" defaultValue={topic?.status ?? "NOT_STARTED"}>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </Label>
        <Label>Confidence
          <Select name="confidenceRating" defaultValue={topic?.confidenceRating ?? ""}>
            <option value="">Optional</option>
            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
        </Label>
      </div>
      <Label>Notes<Textarea name="notes" defaultValue={topic?.notes ?? ""} /></Label>
      <Button type="submit" pendingText={topic ? "Saving..." : "Adding..."}>{topic ? "Save topic" : "Add topic"}</Button>
    </form>
  );
}

export function DeleteTopicButton({ topic }: { topic: Pick<EditableTopic, "id" | "name"> }) {
  return (
    <form action={deleteTopic}>
      <input type="hidden" name="id" value={topic.id} />
      <ConfirmSubmitButton
        confirmationMessage={`Delete topic "${topic.name}" and its learning history?`}
        variant="danger"
        pendingText="Deleting..."
      >
        Delete topic
      </ConfirmSubmitButton>
    </form>
  );
}

export function TopicRow({ topic }: { topic: { id: string; name: string; status: string; confidenceRating: number | null } }) {
  return (
    <Link href={`/topics/${topic.id}`} className="flex min-w-0 flex-col gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0 break-words font-medium leading-snug">{topic.name}</span>
      <span className="flex shrink-0 items-center gap-2">
        <Badge>{topic.status.replace("_", " ").toLowerCase()}</Badge>
        {topic.confidenceRating ? <span className="flex text-amber-600">{Array.from({ length: topic.confidenceRating }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}</span> : null}
      </span>
    </Link>
  );
}
