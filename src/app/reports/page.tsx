import { format, isSameDay, startOfWeek, addDays } from "date-fns";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { getChildren, getChildDashboard } from "@/features/dashboard/queries";
import { requireCurrentUser } from "@/lib/auth";
import { WeeklyActivityChart } from "@/features/reports/charts";
import { minutesLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireCurrentUser();
  const children = await getChildren(user.id);
  const dashboards = (await Promise.all(children.map((child) => getChildDashboard(user.id, child.id)))).filter(Boolean);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const allSessions = dashboards.flatMap((dashboard) => dashboard!.analytics.sessions);
  const chartData = Array.from({ length: 7 }).map((_, index) => {
    const day = addDays(weekStart, index);
    const sessions = allSessions.filter((session) => isSameDay(session.date, day));
    return {
      name: format(day, "EEE"),
      study: sessions.filter((session) => session.type === "study").reduce((total, session) => total + session.durationMinutes, 0),
      practice: sessions.filter((session) => session.type === "practice").length,
      revision: sessions.filter((session) => session.type === "revision").length,
    };
  });
  const totalStudy = allSessions.filter((session) => session.type === "study").reduce((total, session) => total + session.durationMinutes, 0);

  return (
    <AppShell>
      <div className="grid gap-6">
        <header><h1 className="text-3xl font-semibold tracking-tight">Reports</h1><p className="mt-1 text-sm text-stone-600">Weekly and monthly progress at a glance.</p></header>
        <section className="grid gap-4 md:grid-cols-4">
          <Card><CardTitle>Study Time</CardTitle><p className="mt-3 text-2xl font-semibold">{minutesLabel(totalStudy)}</p></Card>
          <Card><CardTitle>Study Sessions</CardTitle><p className="mt-3 text-2xl font-semibold">{allSessions.filter((s) => s.type === "study").length}</p></Card>
          <Card><CardTitle>Practice Sessions</CardTitle><p className="mt-3 text-2xl font-semibold">{allSessions.filter((s) => s.type === "practice").length}</p></Card>
          <Card><CardTitle>Revision Sessions</CardTitle><p className="mt-3 text-2xl font-semibold">{allSessions.filter((s) => s.type === "revision").length}</p></Card>
        </section>
        <Card>
          <CardTitle>This week</CardTitle>
          <div className="mt-4"><WeeklyActivityChart data={chartData} /></div>
        </Card>
        <section className="grid gap-4 md:grid-cols-2">
          {dashboards.map((dashboard) => (
            <Card key={dashboard!.child.id}>
              <CardTitle>{dashboard!.child.name}</CardTitle>
              <p className="mt-3 text-sm text-stone-600">Topics completed: {dashboard!.analytics.topicProgress.completed}</p>
              <p className="text-sm text-stone-600">Habit goal achievement: {dashboard!.analytics.habitGoals[0]?.progress.successPercentage ?? 0}%</p>
              <p className="text-sm text-stone-600">Outcome goal progress: {dashboard!.analytics.outcomeGoals[0]?.progress ?? 0}%</p>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
