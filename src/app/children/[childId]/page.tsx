import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, RotateCcw, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Progress } from "@/components/ui/progress";
import { calculateTopicProgress } from "@/lib/analytics";
import { requireParentUser } from "@/lib/auth";
import { formatClassLabel } from "@/lib/display";
import { resolveSubjectColor } from "@/lib/subject-colors";
import { minutesLabel } from "@/lib/utils";
import { ChapterForm } from "@/features/chapters/components";
import { ChildForm, DangerDeleteChild } from "@/features/children/components";
import { getChildDashboard } from "@/features/dashboard/queries";
import { DeleteSubjectButton, SubjectForm } from "@/features/subjects/components";
import { TopicForm, TopicRow } from "@/features/topics/components";

export const dynamic = "force-dynamic";

function matchesSubjectQuery(subject: Awaited<ReturnType<typeof getChildDashboard>>["child"]["subjects"][number], query: string) {
  if (!query) return true;
  const haystack = [
    subject.name,
    ...subject.chapters.map((chapter) => chapter.name),
    ...subject.chapters.flatMap((chapter) => chapter.topics.map((topic) => topic.name)),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export default async function ChildPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams?: Promise<{ deleteError?: string; created?: string; subject?: string }>;
}) {
  const user = await requireParentUser();
  const { childId } = await params;
  const query = await searchParams;
  const dashboard = await getChildDashboard(user.id, childId);
  if (!dashboard) notFound();

  const { child, analytics } = dashboard;
  const deleteError = query?.deleteError ? String(query.deleteError) : null;
  const created = query?.created ? String(query.created) : null;
  const subjectQuery = String(query?.subject ?? "").trim().toLowerCase();
  const visibleSubjects = child.subjects.filter((subject) => matchesSubjectQuery(subject, subjectQuery));

  return (
    <AppShell>
      <div className="grid gap-6">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-emerald-800">{formatClassLabel(child.className)}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{child.name}</h1>
            <p className="mt-1 text-sm text-stone-600">{child.school ?? "School not set"}</p>
            <p className="mt-3 text-sm text-stone-600">
              <Link href="/" className="text-emerald-800 hover:underline">
                Back to overview
              </Link>
            </p>
          </div>
          <Badge>{analytics.topicProgress.progress}% topics complete</Badge>
        </header>

        {created ? <Notice tone="success">Child created.</Notice> : null}
        {deleteError ? <Notice tone="error">{deleteError}</Notice> : null}

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

        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-base">Subject map</CardTitle>
              <p className="mt-2 text-sm text-stone-600">Each subject keeps one familiar color, so it is easy to scan and jump around quickly.</p>
            </div>
            <form className="flex flex-col gap-2 sm:flex-row">
              <input
                name="subject"
                defaultValue={subjectQuery}
                placeholder="Search subjects, chapters, or topics"
                className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm"
              />
              <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-100">
                Search
              </button>
              {subjectQuery ? (
                <Link href={`/children/${child.id}`} className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-100">
                  Clear
                </Link>
              ) : null}
            </form>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visibleSubjects.map((subject) => {
              const subjectTopics = subject.chapters.flatMap((chapter) => chapter.topics);
              const subjectProgress = calculateTopicProgress(subjectTopics.map((topic) => ({ status: topic.status })));
              const subjectColor = resolveSubjectColor(subject.name, subject.color);
              return (
                <Link
                  key={subject.id}
                  href={`#subject-${subject.id}`}
                  className="rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{ borderColor: subjectColor }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-stone-900">{subject.name}</p>
                      <p className="mt-1 text-sm text-stone-600">{subject.chapters.length} chapters · {subjectTopics.length} topics</p>
                    </div>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subjectColor }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-stone-600">
                    <span>{subjectProgress.completed} completed</span>
                    <span>{subjectProgress.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full" style={{ width: `${subjectProgress.progress}%`, backgroundColor: subjectColor }} />
                  </div>
                </Link>
              );
            })}
          </div>
          {!visibleSubjects.length ? <p className="mt-4 text-sm text-stone-600">No subjects match that search yet.</p> : null}
        </Card>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="grid gap-4 min-w-0 xl:grid-cols-2">
            {visibleSubjects.map((subject) => {
              const subjectTopics = subject.chapters.flatMap((chapter) => chapter.topics);
              const subjectProgress = calculateTopicProgress(subjectTopics.map((topic) => ({ status: topic.status })));
              const subjectColor = resolveSubjectColor(subject.name, subject.color);

              return (
                <Card key={subject.id} id={`subject-${subject.id}`} className="border-l-4" style={{ borderLeftColor: subjectColor }}>
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subjectColor }} />
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                      </div>
                      <p className="text-sm text-stone-600">{subject.chapters.length} chapters Â· {subjectProgress.completed} completed Â· {subjectProgress.pending} pending</p>
                    </div>
                    <div className="w-full sm:w-48"><Progress value={subjectProgress.progress} /></div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <SubjectForm
                      childId={child.id}
                      childThemeColor={child.themeColor}
                      subject={{ id: subject.id, name: subject.name, color: subject.color }}
                    />
                    <div className="flex justify-end">
                      <DeleteSubjectButton id={subject.id} childId={child.id} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {subject.chapters.map((chapter) => {
                      const chapterProgress = calculateTopicProgress(chapter.topics.map((topic) => ({ status: topic.status })));
                      return (
                        <div key={chapter.id} className="rounded-md border border-stone-200 p-3">
                          <div className="flex items-center justify-between gap-3">
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

            {!visibleSubjects.length ? (
              <Card className="xl:col-span-2">
                <CardTitle>No matching subjects</CardTitle>
                <p className="mt-2 text-sm text-stone-600">Try a broader search or clear the filter to bring every subject back.</p>
              </Card>
            ) : null}
          </div>

          <aside className="grid content-start gap-4 min-w-0">
            <Card>
              <CardTitle>Edit child</CardTitle>
              <div className="mt-4"><ChildForm child={child} /></div>
            </Card>
            <Card>
              <CardTitle>Add subject</CardTitle>
              <div className="mt-4"><SubjectForm childId={child.id} childThemeColor={child.themeColor} /></div>
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
            <DangerDeleteChild child={child} errorMessage={deleteError} />
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
