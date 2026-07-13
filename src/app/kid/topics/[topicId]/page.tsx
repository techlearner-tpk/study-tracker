import { format } from "date-fns";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { AiLearningPanel } from "@/features/ai/components";
import { getTopicAiAccessState } from "@/features/ai/service";
import { requireKidUser } from "@/lib/auth";
import { getOwnedTopic } from "@/lib/ownership";
import { minutesLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KidTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const user = await requireKidUser();
  const { topicId } = await params;
  if (!user.childId) notFound();

  const topic = await getOwnedTopic(user.id, topicId);
  const access = await getTopicAiAccessState(user.id, topicId);

  const totalStudyTime = topic.studySessions.reduce((total, session) => total + session.durationMinutes, 0);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-4xl gap-6">
        <header>
          <p className="text-sm text-stone-600">{topic.chapter.subject.child.name} · {topic.chapter.subject.name} · {topic.chapter.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{topic.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{topic.status.replace("_", " ").toLowerCase()}</Badge>
            <Badge>Confidence {topic.confidenceRating ? `${topic.confidenceRating}/5` : "not set"}</Badge>
            <Badge>{minutesLabel(totalStudyTime)} total</Badge>
          </div>
        </header>

        <Card>
          <CardTitle>About this topic</CardTitle>
          <p className="mt-3 text-sm text-stone-600">{topic.description ?? "No description yet."}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">{topic.notes ?? "No notes yet."}</p>
        </Card>

        <AiLearningPanel access={access} topicId={topic.id} />

        <Card>
          <CardTitle>Study timeline</CardTitle>
          <div className="mt-4 grid gap-3">
            {topic.studySessions.length ? topic.studySessions.map((session) => (
              <div key={session.id} className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm">
                <p className="font-medium">{minutesLabel(session.durationMinutes)}</p>
                <p className="text-xs text-stone-500">{format(session.startTime, "PP p")}</p>
              </div>
            )) : <p className="text-sm text-stone-600">No study activity yet.</p>}
          </div>
        </Card>
      </div>
    </main>
  );
}
