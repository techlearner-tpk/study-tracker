import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Clock, GraduationCap, Mail, Plus, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ChildForm, KidInviteForm } from "@/features/children/components";
import { getChildren, getChildDashboard } from "@/features/dashboard/queries";
import { loadPublishedCurriculumCatalog } from "@/features/curriculum/service";
import { formatClassLabel } from "@/lib/display";
import { requireCurrentUser } from "@/lib/auth";
import { minutesLabel } from "@/lib/utils";
import { Notice } from "@/components/ui/notice";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ inviteStatus?: string; inviteError?: string; childError?: string; deleteStatus?: string }>;
}) {
  const user = await requireCurrentUser();
  if (user.role === "KID") {
    redirect("/kid");
  }
  const query = await searchParams;
  const children = await getChildren(user.id);
  const curricula = await loadPublishedCurriculumCatalog();
  const dashboards = await Promise.all(children.map((child) => getChildDashboard(user.id, child.id)));
  const inviteStatus = query?.inviteStatus ? String(query.inviteStatus) : null;
  const inviteError = query?.inviteError ? String(query.inviteError) : null;
  const childError = query?.childError ? String(query.childError) : null;
  const deleteStatus = query?.deleteStatus ? String(query.deleteStatus) : null;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-700">Children</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Manage your children's learning</h1>
            <p className="mt-2 text-sm text-slate-500">Track study time, streaks, topics, assignments, and AI learning from one calm place.</p>
          </div>
          <a href="#add-child">
            <Button type="button">
              <Plus size={16} />
              Add child
            </Button>
          </a>
        </header>

        {inviteStatus === "sent" ? <Notice tone="success">Invite sent. Ask the kid to open the email and complete sign-up.</Notice> : null}
        {inviteError ? <Notice tone="error">{inviteError}</Notice> : null}
        {childError ? <Notice tone="error">{childError}</Notice> : null}
        {deleteStatus ? <Notice tone="success">Child deleted.</Notice> : null}

        <section className="grid gap-4 xl:grid-cols-2">
          {dashboards.map(({ child, analytics }) => (
            <ChildSummaryCard key={child.id} child={child} analytics={analytics} />
          ))}
        </section>

        <Card className="border-emerald-100 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm">
                <Mail size={22} />
              </span>
              <div>
                <CardTitle className="text-base">Invite your child by email</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Add the child's sign-in email so they can open their own student view.</p>
              </div>
            </div>
            <div className="w-full sm:max-w-xl">
              <KidInviteForm compact />
            </div>
          </div>
        </Card>

        <section id="add-child" className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.8fr)] xl:items-start">
          <Card className="self-start">
            <CardTitle className="flex items-center gap-2">
              <Plus size={16} /> Add child
            </CardTitle>
            <div className="mt-4">
              <ChildForm showKidEmail curricula={curricula} />
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-white to-emerald-50">
            <CardTitle>What gets created</CardTitle>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <p className="flex items-center gap-2"><BookOpen size={16} className="text-emerald-700" /> Reusable curriculum subjects and chapters.</p>
              <p className="flex items-center gap-2"><Target size={16} className="text-emerald-700" /> Topic progress, practice, and revision tracking.</p>
              <p className="flex items-center gap-2"><Trophy size={16} className="text-emerald-700" /> Habit and outcome goals for the child.</p>
            </div>
          </Card>
        </section>

        {children.length === 0 ? (
          <Card className="text-center">
            <CardTitle>No children yet</CardTitle>
            <p className="mt-2 text-sm text-stone-600">Add a child to create default subjects and begin tracking calmly.</p>
          </Card>
        ) : (
          <Card>
            <CardTitle>Children</CardTitle>
            <div className="mt-4 flex flex-wrap gap-2">
              {children.map((child) => <Badge key={child.id}>{child.name}</Badge>)}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function ChildSummaryCard({
  child,
  analytics,
}: {
  child: Awaited<ReturnType<typeof getChildDashboard>>["child"];
  analytics: Awaited<ReturnType<typeof getChildDashboard>>["analytics"];
}) {
  const themeColor = child.themeColor ?? "#0f766e";
  return (
    <Card className="h-full transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_14px_34px_rgba(15,118,110,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white shadow-sm" style={{ backgroundColor: themeColor }}>
            {child.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{child.name}</CardTitle>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <GraduationCap size={15} />
              {formatClassLabel(child.className)}
              {child.school ? <span>| {child.school}</span> : null}
            </p>
            <Badge className="mt-2 border-emerald-100 bg-emerald-50 text-emerald-800">Active</Badge>
          </div>
        </div>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: themeColor }} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-4 sm:grid-cols-4">
        <Metric icon={<Clock size={17} />} label="Study time" value={minutesLabel(analytics.todayStudyTime)} hint="Today" />
        <Metric icon={<Target size={17} />} label="Streak" value={`${analytics.currentStreak} day${analytics.currentStreak === 1 ? "" : "s"}`} hint={`Best: ${analytics.longestStreak}`} />
        <Metric icon={<Trophy size={17} />} label="Completed" value={`${analytics.topicProgress.completed}`} hint="Topics" />
        <Metric icon={<BookOpen size={17} />} label="Practice" value={`${analytics.practiceCount} / ${analytics.revisionCount}`} hint="Practice / revision" />
      </div>

      <Link href={`/children/${child.id}`} className="mt-4 flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
        Open dashboard
        <ArrowRight size={16} />
      </Link>
    </Card>
  );
}

function Metric({ hint, icon, label, value }: { hint?: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">{icon}<span>{label}</span></div>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
