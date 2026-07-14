import { format } from "date-fns";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { AiLearningPanel } from "@/features/ai/components";
import { getTopicAiAccessState } from "@/features/ai/service";
import { PracticeSessionForm } from "@/features/practice-sessions/components";
import { RevisionSessionForm } from "@/features/revision-sessions/components";
import { StudySessionForm } from "@/features/study-sessions/components";
import { getOwnedTopic } from "@/lib/ownership";
import { requireCurrentUser } from "@/lib/auth";
import { minutesLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const user = await requireCurrentUser();
  const { topicId } = await params;
  const topic = await getOwnedTopic(user.id, topicId);
  const access = await getTopicAiAccessState(user.id, topicId);
  const isAdmin = user.role === "PARENT";

  const totalStudyTime = topic.studySessions.reduce((total, session) => total + session.durationMinutes, 0);
  const timeline = [
    ...topic.studySessions.map((session) => ({ type: "Study", date: session.startTime, minutes: session.durationMinutes, notes: session.notes })),
    ...topic.practiceSessions.map((session) => ({ type: "Practice", date: session.date, minutes: session.durationMinutes, notes: session.notes })),
    ...topic.revisionSessions.map((session) => ({ type: "Revision", date: session.date, minutes: session.durationMinutes, notes: session.notes })),
  ].sort((a, b) => Number(b.date) - Number(a.date));

  return (
    <AppShell>
      <div className="grid gap-6">
        <header>
          <p className="text-sm text-stone-600">{topic.chapter.subject.child.name} · {topic.chapter.subject.name} · {topic.chapter.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{topic.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{topic.status.replace("_", " ").toLowerCase()}</Badge>
            <Badge>Confidence {topic.confidenceRating ? `${topic.confidenceRating}/5` : "not set"}</Badge>
            <Badge>{minutesLabel(totalStudyTime)} total</Badge>
            <Badge>{topic.studySessions.length} study sessions</Badge>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card><CardTitle>Status</CardTitle><p className="mt-3 text-sm text-stone-600">{topic.description ?? "No description yet."}</p></Card>
          <Card><CardTitle>Notes</CardTitle><p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">{topic.notes ?? "No notes yet."}</p></Card>
          <Card><CardTitle>Last studied</CardTitle><p className="mt-3 text-sm text-stone-600">{topic.studySessions[0] ? format(topic.studySessions[0].startTime, "PP p") : "Not studied yet"}</p></Card>
        </section>

        <AiLearningPanel
          access={access}
          topicId={topic.id}
          topicName={topic.name}
          historyHref={`/topics/${topic.id}/ai-history`}
          isAdmin={isAdmin}
        />

        <section className="grid gap-4">
          <Card><CardTitle>Study Sessions</CardTitle><div className="mt-4"><StudySessionForm topicId={topic.id} /></div></Card>
          <Card><CardTitle>Practice Sessions</CardTitle><div className="mt-4"><PracticeSessionForm topicId={topic.id} /></div></Card>
          <Card><CardTitle>Revision Sessions</CardTitle><div className="mt-4"><RevisionSessionForm topicId={topic.id} /></div></Card>
        </section>

        <Card>
          <CardTitle>Timeline of activity</CardTitle>
          <div className="mt-4 grid gap-3">
            {timeline.length ? timeline.map((item, index) => (
              <div key={`${item.type}-${index}`} className="rounded-md border border-stone-200 p-3">
                <div className="flex justify-between text-sm"><span className="font-medium">{item.type}</span><span>{minutesLabel(item.minutes)}</span></div>
                <p className="text-xs text-stone-500">{format(item.date, "PP p")}</p>
                {item.notes ? <p className="mt-2 text-sm text-stone-600">{item.notes}</p> : null}
              </div>
            )) : <p className="text-sm text-stone-600">No activity yet.</p>}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
