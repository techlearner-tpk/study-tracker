import { Suspense } from "react";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { DeferredTopicAiPanel, TopicAiPanelFallback } from "@/features/ai/deferred-topic-panel";
import { TopicActivityWorkspace } from "@/features/topics/activity-workspace";
import { isAdminUser, requireCurrentUser } from "@/lib/auth";
import { getOwnedTopic } from "@/lib/ownership";
import { minutesLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams?: Promise<{ deleteError?: string; deleteStatus?: string; studyStatus?: string; practiceStatus?: string; revisionStatus?: string }>;
}) {
  const user = await requireCurrentUser();
  const { topicId } = await params;
  const query = await searchParams;
  const topic = await getOwnedTopic(user.id, topicId);
  const isAdmin = isAdminUser(user);
  const deleteError = query?.deleteError ? String(query.deleteError) : null;
  const deleteStatus = query?.deleteStatus ? String(query.deleteStatus) : null;
  const studyStatus = query?.studyStatus ? String(query.studyStatus) : null;
  const practiceStatus = query?.practiceStatus ? String(query.practiceStatus) : null;
  const revisionStatus = query?.revisionStatus ? String(query.revisionStatus) : null;
  const subjectColor = topic.chapter.subject.color ?? "#4f766a";

  const totalStudyTime = topic.studySessions.reduce((total, session) => total + session.durationMinutes, 0);
  return (
    <AppShell currentUser={user}>
      <div className="grid gap-6">
        <header>
          <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <span>{topic.chapter.subject.child.name}</span>
            <span>|</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectColor }} />
              {topic.chapter.subject.name}
            </span>
            <span>|</span>
            <span>{topic.chapter.name}</span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{topic.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{topic.status.replace("_", " ").toLowerCase()}</Badge>
            <Badge>Confidence {topic.confidenceRating ? `${topic.confidenceRating}/5` : "not set"}</Badge>
            <Badge>{minutesLabel(totalStudyTime)} total</Badge>
            <Badge>{topic.studySessions.length} study sessions</Badge>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardTitle>Status</CardTitle>
            <p className="mt-3 text-sm text-stone-600">{topic.description ?? "No description yet."}</p>
          </Card>
          <Card>
            <CardTitle>Notes</CardTitle>
            <p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">{topic.notes ?? "No notes yet."}</p>
          </Card>
          <Card>
            <CardTitle>Last studied</CardTitle>
            <p className="mt-3 text-sm text-stone-600">{topic.studySessions[0] ? format(topic.studySessions[0].startTime, "PP p") : "Not studied yet"}</p>
          </Card>
        </section>

        {deleteStatus ? <Notice tone="success">AI history cleared.</Notice> : null}
        {studyStatus ? <Notice tone="success">Study session logged.</Notice> : null}
        {practiceStatus ? <Notice tone="success">Practice session logged.</Notice> : null}
        {revisionStatus ? <Notice tone="success">Revision session logged.</Notice> : null}

        <TopicActivityWorkspace topic={topic} />

        <Suspense fallback={<TopicAiPanelFallback />}>
          <DeferredTopicAiPanel
            userId={user.id}
            topic={topic}
            historyHref={`/topics/${topic.id}/ai-history`}
            deleteError={deleteError}
            isAdmin={isAdmin}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
