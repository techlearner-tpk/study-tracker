import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Flag, PenLine, PlusCircle, RotateCcw, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/notice";
import { Progress } from "@/components/ui/progress";
import { calculateTopicProgress } from "@/lib/analytics";
import { requireParentUser } from "@/lib/auth";
import { formatClassLabel } from "@/lib/display";
import { resolveSubjectColor } from "@/lib/subject-colors";
import { minutesLabel } from "@/lib/utils";
import { ChapterForm } from "@/features/chapters/components";
import { ChildForm, DangerDeleteChild } from "@/features/children/components";
import { DynamicGreeting } from "@/features/dashboard/greeting";
import { getChildDashboard } from "@/features/dashboard/queries";
import { createHabitGoal, createOutcomeGoal } from "@/features/goals/actions";
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

function withAlpha(hexColor: string, alphaHex: string) {
  return `${hexColor}${alphaHex}`;
}

function subjectDetailHref(childId: string, subjectId: string, subjectQuery: string) {
  const params = new URLSearchParams();
  if (subjectQuery) params.set("subject", subjectQuery);
  params.set("subjectId", subjectId);
  return `/children/${childId}?${params.toString()}#subject-details`;
}

export default async function ChildPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams?: Promise<{ deleteError?: string; created?: string; subject?: string; subjectId?: string }>;
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
  const selectedSubjectId = String(query?.subjectId ?? "");
  const activeSubject = visibleSubjects.find((subject) => subject.id === selectedSubjectId) ?? visibleSubjects[0] ?? null;
  const childColor = child.themeColor ?? "#0f766e";

  return (
    <AppShell>
      <div className="grid gap-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white shadow-sm" style={{ backgroundColor: childColor }}>
              {child.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-700">{formatClassLabel(child.className)}</p>
              <h1 className="truncate text-3xl font-semibold tracking-tight text-slate-950">{child.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{child.school ?? "School not set"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-emerald-100 bg-emerald-50 text-emerald-800">{analytics.topicProgress.progress}% topics complete</Badge>
            <p className="text-sm text-slate-500">
              <Link href="/" className="text-emerald-800 hover:underline">
                Back to overview
              </Link>
            </p>
          </div>
        </header>

        {created ? <Notice tone="success">Child created.</Notice> : null}
        {deleteError ? <Notice tone="error">{deleteError}</Notice> : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="grid min-w-0 gap-6">
        <Card className="overflow-hidden border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 py-6">
          <div className="flex min-h-24 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DynamicGreeting name={child.name} />
              <p className="mt-2 text-sm text-slate-500">Let's make today a steady learning day.</p>
            </div>
            <div className="hidden items-center gap-8 sm:flex">
              <StudyGreetingArt />
              <div className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
                {analytics.topicProgress.pending} topics waiting
              </div>
            </div>
          </div>
        </Card>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={<Clock size={18} />} label="Today's Study Time" value={minutesLabel(analytics.todayStudyTime)} />
          <Metric icon={<Target size={18} />} label="Current Streak" value={`${analytics.currentStreak} days`} />
          <Metric icon={<Trophy size={18} />} label="Completed Topics" value={`${analytics.topicProgress.completed}`} />
          <Metric icon={<RotateCcw size={18} />} label="Practice / Revision" value={`${analytics.practiceCount} / ${analytics.revisionCount}`} />
        </section>

        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-base">Subject map</CardTitle>
              <p className="mt-2 text-sm text-stone-600">Each subject keeps one familiar color, so it is easy to scan and jump around quickly.</p>
            </div>
            <form className="flex flex-col gap-2 sm:flex-row">
              <Input
                name="subject"
                defaultValue={subjectQuery}
                placeholder="Search subjects, chapters, or topics"
                className="sm:w-72"
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
              {subjectQuery ? (
                <Link href={`/children/${child.id}`} className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-emerald-50">
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
              const isActive = activeSubject?.id === subject.id;
              return (
                <a
                  key={subject.id}
                  href={subjectDetailHref(child.id, subject.id, subjectQuery)}
                  className="rounded-lg border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${withAlpha(subjectColor, "14")}, #ffffff 82%)`,
                    borderColor: isActive ? subjectColor : withAlpha(subjectColor, "33"),
                    boxShadow: isActive ? `inset 0 -3px 0 ${subjectColor}` : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{subject.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {subject.chapters.length} chapters | {subjectTopics.length} topics
                      </p>
                    </div>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subjectColor }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                    <span>{subjectProgress.completed} completed</span>
                    <span>{subjectProgress.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                    <div className="h-full rounded-full" style={{ width: `${subjectProgress.progress}%`, backgroundColor: subjectColor }} />
                  </div>
                </a>
              );
            })}
          </div>
          {!visibleSubjects.length ? <p className="mt-4 text-sm text-stone-600">No subjects match that search yet.</p> : null}
        </Card>

        <section className="grid gap-4">
          <div id="subject-details" className="grid min-w-0 gap-4 scroll-mt-6">
            {activeSubject ? [activeSubject].map((subject) => {
              const subjectTopics = subject.chapters.flatMap((chapter) => chapter.topics);
              const subjectProgress = calculateTopicProgress(subjectTopics.map((topic) => ({ status: topic.status })));
              const subjectColor = resolveSubjectColor(subject.name, subject.color);

              return (
                <Card
                  key={subject.id}
                  id={`subject-${subject.id}`}
                  className="overflow-hidden border"
                  style={{ borderColor: withAlpha(subjectColor, "33") }}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subjectColor }} />
                        <CardTitle className="text-xl">{subject.name}</CardTitle>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {subject.chapters.length} chapters | {subjectTopics.length} topics
                      </p>
                    </div>
                    <div className="w-full sm:w-56">
                      <div className="mb-2 flex justify-between text-sm text-slate-600">
                        <span>{subjectProgress.progress}% complete</span>
                        <span>{subjectProgress.completed}/{subjectTopics.length}</span>
                      </div>
                      <Progress value={subjectProgress.progress} />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-sm font-semibold text-slate-700">Chapters</p>
                      <div className="mt-3 grid gap-2">
                        {subject.chapters.map((chapter, index) => {
                          const chapterProgress = calculateTopicProgress(chapter.topics.map((topic) => ({ status: topic.status })));
                          return (
                            <Link
                              key={chapter.id}
                              href={`#chapter-${chapter.id}`}
                              className="flex min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-3 text-sm transition hover:bg-white"
                              style={{
                                backgroundColor: index === 0 ? withAlpha(subjectColor, "10") : "#ffffff",
                                borderColor: index === 0 ? withAlpha(subjectColor, "40") : "#e2e8f0",
                              }}
                            >
                              <span className="min-w-0">
                                <span className="block min-w-0 break-words font-medium leading-snug text-slate-800">{chapter.name}</span>
                                <span className="block text-xs text-slate-500">
                                  {chapter.topics.length} topics | {chapterProgress.progress}%
                                </span>
                              </span>
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full border" style={{ borderColor: subjectColor }} />
                            </Link>
                          );
                        })}
                      </div>
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-emerald-800">Add chapter</summary>
                        <div className="mt-3"><ChapterForm subjectId={subject.id} /></div>
                      </details>
                    </div>

                    <div className="grid min-w-0 gap-4">
                      {subject.chapters.map((chapter) => {
                        const chapterProgress = calculateTopicProgress(chapter.topics.map((topic) => ({ status: topic.status })));
                        return (
                          <div key={chapter.id} id={`chapter-${chapter.id}`} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                              <div className="min-w-0">
                                <p className="break-words text-sm font-semibold leading-snug text-slate-950">Topics in {chapter.name}</p>
                                <p className="mt-1 text-sm text-slate-500">Chapter progress {chapterProgress.progress}%</p>
                              </div>
                              <div className="w-full sm:w-56"><Progress value={chapterProgress.progress} /></div>
                            </div>
                            <div className="mt-4 grid gap-2">
                              {chapter.topics.length ? chapter.topics.map((topic) => <TopicRow key={topic.id} topic={topic} />) : <p className="text-sm text-slate-500">No topics yet.</p>}
                            </div>
                            <details className="mt-4">
                              <summary className="cursor-pointer text-sm font-medium text-emerald-800">Add topic</summary>
                              <div className="mt-3"><TopicForm chapterId={chapter.id} /></div>
                            </details>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">Edit subject</summary>
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
                  </details>
                </Card>
              );
            }) : null}

            {!visibleSubjects.length ? (
              <Card>
                <CardTitle>No matching subjects</CardTitle>
                <p className="mt-2 text-sm text-stone-600">Try a broader search or clear the filter to bring every subject back.</p>
              </Card>
            ) : null}
          </div>
        </section>
          </div>

          <aside className="grid min-w-0 content-start gap-4 text-left">
            <GoalPanel
              accent="emerald"
              description="Build daily habits for consistent learning."
              icon={<Target size={20} />}
              title="Habit goals"
            >
              <AddHabitGoal childId={child.id} />
              <HabitGoalList goals={analytics.habitGoals} currentStreak={analytics.currentStreak} longestStreak={analytics.longestStreak} />
            </GoalPanel>

            <GoalPanel
              accent="violet"
              description="Set learning outcomes and track progress."
              icon={<Flag size={20} />}
              title="Outcome goals"
            >
              <AddOutcomeGoal child={child} />
              <OutcomeGoalList goals={analytics.outcomeGoals} />
            </GoalPanel>

            <Card>
              <IconTitle icon={<CheckCircle2 size={18} />} title="Recently studied" />
              <div className="mt-4 grid gap-2">
                {analytics.recentlyStudied.length ? analytics.recentlyStudied.map((topic) => (
                  <Link key={topic.id} href={`/topics/${topic.id}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-emerald-50">
                    <span className="font-medium">{topic.name}</span>
                    <span className="block text-xs text-slate-500">{topic.subjectName}</span>
                  </Link>
                )) : <p className="text-sm text-slate-600">No study sessions logged yet.</p>}
              </div>
            </Card>
            <Card>
              <IconTitle icon={<PenLine size={18} />} title="Edit child" />
              <div className="mt-4"><ChildForm child={child} /></div>
            </Card>
            <Card>
              <IconTitle icon={<PlusCircle size={18} />} title="Add subject" />
              <div className="mt-4"><SubjectForm childId={child.id} childThemeColor={child.themeColor} /></div>
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
      <div className="flex items-center gap-2 text-emerald-700">{icon}<span className="text-sm font-medium text-slate-500">{label}</span></div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </Card>
  );
}

function StudyGreetingArt() {
  return (
    <div className="relative h-24 w-44 shrink-0 overflow-visible" aria-hidden="true">
      <img
        src="/assets/study-greeting.png"
        alt=""
        className="absolute right-0 top-1/2 h-[8.4rem] w-[15.4rem] max-w-none -translate-y-1/2 rounded-xl object-cover object-center opacity-90 mix-blend-multiply"
      />
    </div>
  );
}

function IconTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-emerald-700">
      {icon}
      <CardTitle>{title}</CardTitle>
    </div>
  );
}

function GoalPanel({
  accent,
  children,
  description,
  icon,
  title,
}: {
  accent: "emerald" | "violet";
  children: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  const accentClasses =
    accent === "violet"
      ? {
          card: "border-violet-100 bg-violet-50/25",
          title: "text-violet-700",
        }
      : {
          card: "border-emerald-100 bg-emerald-50/25",
          title: "text-emerald-700",
        };

  return (
    <Card className={`${accentClasses.card} overflow-hidden`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={`flex items-center gap-2 ${accentClasses.title}`}>
            {icon}
            <CardTitle>{title}</CardTitle>
          </div>
          <p className="mt-3 text-sm text-slate-600">{description}</p>
        </div>
        <GoalArt accent={accent} />
      </div>
      <div className="mt-4 grid gap-4">{children}</div>
    </Card>
  );
}

function GoalArt({ accent }: { accent: "emerald" | "violet" }) {
  const src = accent === "violet" ? "/assets/outcome-goal.png" : "/assets/habit-goal.png";
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-visible" aria-hidden="true">
      <img
        src={src}
        alt=""
        className="absolute right-0 top-1/2 h-28 w-28 max-w-none -translate-y-1/2 rounded-xl object-cover object-center opacity-85 mix-blend-multiply"
      />
    </div>
  );
}

function HabitGoalList({
  currentStreak,
  goals,
  longestStreak,
}: {
  currentStreak: number;
  goals: Awaited<ReturnType<typeof getChildDashboard>>["analytics"]["habitGoals"];
  longestStreak: number;
}) {
  if (!goals.length) {
    return <p className="text-sm text-slate-600">No active habit goals.</p>;
  }

  return (
    <div className="grid gap-3">
      {goals.map((goal) => (
        <div key={goal.id} className="grid gap-2 rounded-md border border-white/70 bg-white/80 p-3">
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="font-medium text-slate-900">{goal.title}</span>
            <span className="shrink-0 text-slate-600">{goal.progress.current}/{goal.progress.target}</span>
          </div>
          <Progress value={goal.progress.successPercentage} />
          <p className="text-xs text-slate-500">Current streak {currentStreak} days. Best {longestStreak} days.</p>
        </div>
      ))}
    </div>
  );
}

function OutcomeGoalList({ goals }: { goals: Awaited<ReturnType<typeof getChildDashboard>>["analytics"]["outcomeGoals"] }) {
  if (!goals.length) {
    return <p className="text-sm text-slate-600">No active outcome goals.</p>;
  }

  return (
    <div className="grid gap-3">
      {goals.map((goal) => (
        <div key={goal.id} className="grid gap-2 rounded-md border border-white/70 bg-white/80 p-3">
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="font-medium text-slate-900">{goal.title}</span>
            <span className="shrink-0 text-slate-600">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} />
          <p className="text-xs text-slate-500">{goal.remainingWork}</p>
        </div>
      ))}
    </div>
  );
}

function AddHabitGoal({ childId }: { childId: string }) {
  return (
    <details>
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-emerald-100 bg-white px-4 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50">
        <PlusCircle size={16} /> Add habit goal
      </summary>
      <form action={createHabitGoal} className="mt-3 grid gap-3 rounded-md border border-emerald-100 bg-white/80 p-3">
        <input type="hidden" name="childId" value={childId} />
        <Label>
          Title
          <Input name="title" placeholder="Study 60 minutes daily" required />
        </Label>
        <Label>
          Metric
          <Select name="metric" defaultValue="STUDY_MINUTES_DAILY">
            <option value="STUDY_MINUTES_DAILY">Daily study minutes</option>
            <option value="STUDY_DAYS_WEEKLY">Weekly study days</option>
            <option value="STUDY_SESSION_DAILY">Daily study sessions</option>
          </Select>
        </Label>
        <Label>
          Target
          <Input name="targetValue" type="number" min="1" defaultValue="60" required />
        </Label>
        <Button type="submit" className="justify-self-start" pendingText="Saving...">
          Save goal
        </Button>
      </form>
    </details>
  );
}

function AddOutcomeGoal({ child }: { child: Awaited<ReturnType<typeof getChildDashboard>>["child"] }) {
  const chapters = child.subjects.flatMap((subject) =>
    subject.chapters.map((chapter) => ({
      id: chapter.id,
      label: `${subject.name} - ${chapter.name}`,
    })),
  );
  const topics = child.subjects.flatMap((subject) =>
    subject.chapters.flatMap((chapter) =>
      chapter.topics.map((topic) => ({
        id: topic.id,
        label: `${subject.name} - ${chapter.name} - ${topic.name}`,
      })),
    ),
  );

  return (
    <details>
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-violet-100 bg-white px-4 text-sm font-semibold text-violet-800 shadow-sm transition hover:bg-violet-50">
        <PlusCircle size={16} /> Add outcome goal
      </summary>
      <div className="mt-3 grid gap-4 rounded-md border border-violet-100 bg-white/80 p-3">
        <form action={createOutcomeGoal} className="grid gap-3">
          <input type="hidden" name="childId" value={child.id} />
          <input type="hidden" name="type" value="COMPLETE_CHAPTER" />
          <Label>
            Title
            <Input name="title" placeholder="Complete Geometry chapter" required />
          </Label>
          <Label>
            Chapter target
            <Select name="targetChapterId" defaultValue={chapters[0]?.id ?? ""} required>
              <option value="">Choose chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.label}
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            Due date
            <Input name="dueDate" type="date" />
          </Label>
          <Button type="submit" className="justify-self-start" pendingText="Saving...">
            Save chapter goal
          </Button>
        </form>

        <form action={createOutcomeGoal} className="grid gap-3 border-t border-violet-100 pt-4">
          <input type="hidden" name="childId" value={child.id} />
          <input type="hidden" name="type" value="COMPLETE_TOPIC" />
          <Label>
            Title
            <Input name="title" placeholder="Complete Polygons topic" required />
          </Label>
          <Label>
            Topic target
            <Select name="targetTopicId" defaultValue={topics[0]?.id ?? ""} required>
              <option value="">Choose topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.label}
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            Due date
            <Input name="dueDate" type="date" />
          </Label>
          <Button type="submit" className="justify-self-start" pendingText="Saving...">
            Save topic goal
          </Button>
        </form>
      </div>
    </details>
  );
}
