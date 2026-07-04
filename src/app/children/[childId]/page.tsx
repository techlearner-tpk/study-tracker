import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, RotateCcw, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChildForm, DangerDeleteChild } from "@/features/children/components";
import { ChapterForm } from "@/features/chapters/components";
import { getChildDashboard } from "@/features/dashboard/queries";
import { SubjectForm } from "@/features/subjects/components";
import { TopicForm, TopicRow } from "@/features/topics/components";
import { requireCurrentUser } from "@/lib/auth";
import { calculateTopicProgress } from "@/lib/analytics";
import { minutesLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ChildPage({ params }: { params: Promise<{ childId: string }> }) {
  const user = await requireCurrentUser();
  const { childId } = await params;
  const dashboard = await getChildDashboard(user.id, childId);
  if (!dashboard) notFound();
  const { child, analytics } = dashboard;

  return (
    <AppShell>
      <div className="grid gap-6">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-emerald-800">Class {child.className}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{child.name}</h1>
            <p className="mt-1 text-sm text-stone-600">{child.school ?? "School not set"}</p>
          </div>
          <Badge>{analytics.topicProgress.progress}% topics complete</Badge>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={<Clock size={18} />} label="Today's Study Time" value={minutesLabel(analytics.todayStudyTime)} />
          <Metric icon={<Target size={18} />} label="Current Streak" value={`${analytics.currentStreak} days`} />
          <Metric icon={<Trophy size={18} />} label="Completed Topics" value={`${analytics.topicProgress.completed}`} />
          <Metric icon={<RotateCcw size={18} />} label="Practice / Revision" value={`${analytics.practiceCount} / ${analytics.revisionCount}`} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle>Habit goals</CardTitle>
            <div className="mt-4 grid gap-4">
              {analytics.habitGoals.length ? analytics.habitGoals.map((goal) => (
                <div key={goal.id} className="grid gap-2">
                  <div className="flex justify-between text-sm"><span>{goal.title}</span><span>{goal.progress.current}/{goal.progress.target}</span></div>
                  <Progress value={goal.progress.successPercentage} />
                  <p className="text-xs text-stone-500">Current streak {analytics.currentStreak} days. Longest streak {analytics.longestStreak} days.</p>
                </div>
              )) : <p className="text-sm text-stone-600">No active habit goals.</p>}
            </div>
          </Card>
          <Card>
            <CardTitle>Outcome goals</CardTitle>
            <div className="mt-4 grid gap-4">
              {analytics.outcomeGoals.length ? analytics.outcomeGoals.map((goal) => (
                <div key={goal.id} className="grid gap-2">
                  <div className="flex justify-between text-sm"><span>{goal.title}</span><span>{goal.progress}%</span></div>
                  <Progress value={goal.progress} />
                  <p className="text-xs text-stone-500">{goal.remainingWork}</p>
                </div>
              )) : <p className="text-sm text-stone-600">No active outcome goals.</p>}
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {child.subjects.map((subject) => {
              const subjectTopics = subject.chapters.flatMap((chapter) => chapter.topics);
              const subjectProgress = calculateTopicProgress(subjectTopics.map((topic) => ({ status: topic.status })));
              return (
                <Card key={subject.id}>
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      <p className="text-sm text-stone-600">{subject.chapters.length} chapters · {subjectProgress.completed} completed · {subjectProgress.pending} pending</p>
                    </div>
                    <div className="w-full sm:w-48"><Progress value={subjectProgress.progress} /></div>
                  </div>
                  <div className="mt-4 grid gap-4">
                    {subject.chapters.map((chapter) => {
                      const chapterProgress = calculateTopicProgress(chapter.topics.map((topic) => ({ status: topic.status })));
                      return (
                        <div key={chapter.id} className="rounded-md border border-stone-200 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{chapter.name}</p>
                              <p className="text-xs text-stone-500">Chapter progress {chapterProgress.progress}%</p>
                            </div>
                            <Badge>{chapter.topics.length} topics</Badge>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {chapter.topics.length ? chapter.topics.map((topic) => <TopicRow key={topic.id} topic={topic} />) : <p className="text-sm text-stone-500">No topics yet.</p>}
                          </div>
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm font-medium text-emerald-800">Add topic</summary>
                            <div className="mt-3"><TopicForm chapterId={chapter.id} /></div>
                          </details>
                        </div>
                      );
                    })}
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-emerald-800">Add chapter to {subject.name}</summary>
                      <div className="mt-3"><ChapterForm subjectId={subject.id} /></div>
                    </details>
                  </div>
                </Card>
              );
            })}
          </div>

          <aside className="grid content-start gap-4">
            <Card>
              <CardTitle>Edit child</CardTitle>
              <div className="mt-4"><ChildForm child={child} /></div>
            </Card>
            <Card>
              <CardTitle>Add subject</CardTitle>
              <div className="mt-4"><SubjectForm childId={child.id} /></div>
            </Card>
            <Card>
              <CardTitle>Recently studied</CardTitle>
              <div className="mt-4 grid gap-2">
                {analytics.recentlyStudied.length ? analytics.recentlyStudied.map((topic) => (
                  <Link key={topic.id} href={`/topics/${topic.id}`} className="rounded-md border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50">
                    <span className="font-medium">{topic.name}</span>
                    <span className="block text-xs text-stone-500">{topic.subjectName}</span>
                  </Link>
                )) : <p className="text-sm text-stone-600">No study sessions logged yet.</p>}
              </div>
            </Card>
            <DangerDeleteChild child={child} />
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-emerald-800">{icon}<span className="text-sm font-medium">{label}</span></div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
