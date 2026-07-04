import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { saveTopic } from "./actions";

export function TopicForm({ chapterId }: { chapterId: string }) {
  return (
    <form action={saveTopic} className="grid gap-3">
      <input type="hidden" name="chapterId" value={chapterId} />
      <Label>Topic<Input name="name" required /></Label>
      <Label>Description<Textarea name="description" /></Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label>Status
          <Select name="status" defaultValue="NOT_STARTED">
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </Label>
        <Label>Confidence
          <Select name="confidenceRating" defaultValue="">
            <option value="">Optional</option>
            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
        </Label>
      </div>
      <Label>Notes<Textarea name="notes" /></Label>
      <Button type="submit">Add topic</Button>
    </form>
  );
}

export function TopicRow({ topic }: { topic: { id: string; name: string; status: string; confidenceRating: number | null } }) {
  return (
    <Link href={`/topics/${topic.id}`} className="flex items-center justify-between rounded-md border border-stone-200 bg-white px-3 py-2 hover:bg-stone-50">
      <span className="font-medium">{topic.name}</span>
      <span className="flex items-center gap-2">
        <Badge>{topic.status.replace("_", " ").toLowerCase()}</Badge>
        {topic.confidenceRating ? <span className="flex text-amber-600">{Array.from({ length: topic.confidenceRating }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}</span> : null}
      </span>
    </Link>
  );
}

