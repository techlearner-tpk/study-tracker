import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ClipboardList, Clock, FileQuestion, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { loadAssignmentsForKid } from "@/features/assignments/service";
import { buildChildAnalytics } from "@/features/dashboard/queries";
import { KidSubjectExplorer } from "@/features/dashboard/kid-subject-explorer";
import { loadOnlineTestPapersForKid } from "@/features/test-papers/service";
import { requireKidUser } from "@/lib/auth";
import { getOwnedChild } from "@/lib/ownership";
import { resolveSubjectColor } from "@/lib/subject-colors";
import { minutesLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KidPage() {
  const user = await requireKidUser();
  if (!user.childId) notFound();

  const [child, assignments, papers] = await Promise.all([
    getOwnedChild(user.id, user.childId),
    loadAssignmentsForKid(user.childId),
    loadOnlineTestPapersForKid(user.childId),
  ]);
  const analytics = buildChildAnalytics(child);
  const openAssignments = assignments.filter((assignment) => !["COMPLETED", "SKIPPED"].includes(assignment.status));
  const openPapers = papers.filter((paper) => ["ASSIGNED", "IN_PROGRESS"].includes(paper.status));
  const completedPapers = papers.filter((paper) => ["SUBMITTED", "EVALUATED"].includes(paper.status));

  return (
    <AppShell currentUser={user}>
      <div className="grid gap-6">
        <header>
          <p className="text-sm font-medium text-emerald-700">Kid portal</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Welcome, {child.name}</h1>
          <p className="mt-2 text-sm text-slate-600">Continue learning, complete assignments, or take an assigned test.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Clock size={18} />} label="Today's study time" value={minutesLabel(analytics.todayStudyTime)} />
          <Metric icon={<Target size={18} />} label="Current streak" value={`${analytics.currentStreak} days`} />
          <Metric icon={<ClipboardList size={18} />} label="Open assignments" value={`${openAssignments.length}`} />
          <Metric icon={<FileQuestion size={18} />} label="Test papers ready" value={`${openPapers.length}`} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <PortalAction description={`${openAssignments.length} assignment${openAssignments.length === 1 ? "" : "s"} waiting for you.`} href="/kid/assignments" icon={<ClipboardList size={22} />} label="Open assignments" />
          <PortalAction description={`${openPapers.length} test paper${openPapers.length === 1 ? "" : "s"} ready to open or continue.`} href="/kid/tests" icon={<FileQuestion size={22} />} label="Open test papers" />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-3"><CardTitle>Assignments to do</CardTitle><Link href="/kid/assignments" className="text-sm font-medium text-emerald-700 hover:underline">View all</Link></div>
            <div className="mt-4 grid gap-2">
              {openAssignments.length ? openAssignments.slice(0, 4).map((assignment) => (
                <Link key={assignment.id} href={`/kid/assignments/${assignment.id}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 transition hover:border-emerald-200 hover:bg-emerald-50">
                  <span className="min-w-0"><span className="block truncate font-medium text-slate-950">{assignment.topic.name}</span><span className="block text-xs text-slate-500">{assignment.topic.chapter.subject.name} | {assignment.type.replaceAll("_", " ").toLowerCase()}</span></span>
                  <ArrowRight size={17} className="shrink-0 text-emerald-700" />
                </Link>
              )) : <EmptyMessage text="No open assignments. You are all caught up." />}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3"><CardTitle>Test papers</CardTitle><Link href="/kid/tests" className="text-sm font-medium text-emerald-700 hover:underline">View all</Link></div>
            <div className="mt-4 grid gap-2">
              {papers.length ? papers.slice(0, 4).map((paper) => (
                <Link key={paper.id} href={`/kid/tests/${paper.id}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 transition hover:border-emerald-200 hover:bg-emerald-50">
                  <span className="min-w-0"><span className="block truncate font-medium text-slate-950">{paper.title}</span><span className="block text-xs text-slate-500">{paper.subject.name} | {paper.totalMarks} marks | {paper.durationMinutes} min</span></span>
                  <Badge>{paper.status.replaceAll("_", " ").toLowerCase()}</Badge>
                </Link>
              )) : <EmptyMessage text="No test papers have been assigned yet." />}
            </div>
          </Card>
        </section>

        <KidSubjectExplorer
          childId={child.id}
          childThemeColor={child.themeColor}
          subjects={child.subjects.map((subject) => ({
            id: subject.id,
            name: subject.name,
            color: resolveSubjectColor(subject.name, subject.color),
            chapters: subject.chapters.map((chapter) => ({
              id: chapter.id,
              name: chapter.name,
              topics: chapter.topics.map((topic) => ({ id: topic.id, name: topic.name, status: topic.status })),
            })),
          }))}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-3"><CardTitle>Learning progress</CardTitle><div className="flex items-center gap-2 text-sm text-slate-600"><Trophy size={17} className="text-emerald-700" />{analytics.topicProgress.completed} topics completed</div></div>
            <div className="mt-4 grid gap-4">
              {analytics.habitGoals.length ? analytics.habitGoals.map((goal) => <div key={goal.id} className="grid gap-2"><div className="flex justify-between text-sm"><span>{goal.title}</span><span>{goal.progress.current}/{goal.progress.target}</span></div><Progress value={goal.progress.successPercentage} /></div>) : <EmptyMessage text="No active learning goals yet." />}
            </div>
          </Card>
          <Card>
            <CardTitle>Recently studied</CardTitle>
            <div className="mt-4 grid gap-2">
              {analytics.recentlyStudied.length ? analytics.recentlyStudied.map((topic) => <Link key={topic.id} href={`/kid/topics/${topic.id}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-emerald-50"><span className="font-medium">{topic.name}</span><span className="block text-xs text-slate-500">{topic.subjectName}</span></Link>) : <EmptyMessage text="No study sessions logged yet." />}
            </div>
          </Card>
        </section>

        {completedPapers.length ? <p className="text-center text-xs text-slate-500">Completed or submitted test papers: {completedPapers.length}</p> : null}
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <Card><div className="flex items-center gap-2 text-emerald-700">{icon}<span className="text-sm font-medium text-slate-600">{label}</span></div><p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p></Card>;
}

function PortalAction({ description, href, icon, label }: { description: string; href: string; icon: React.ReactNode; label: string }) {
  return <Card className="border-emerald-100 bg-emerald-50/40"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-emerald-700">{icon}<CardTitle>{label}</CardTitle></div><p className="mt-2 text-sm text-slate-600">{description}</p></div><Link href={href}><Button type="button" variant="secondary"><ArrowRight size={17} /><span className="sr-only">{label}</span></Button></Link></div></Card>;
}

function EmptyMessage({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">{text}</p>;
}
