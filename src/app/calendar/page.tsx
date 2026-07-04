import { format } from "date-fns";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { calendarActivity } from "@/lib/analytics";
import { getChildren, getChildDashboard } from "@/features/dashboard/queries";
import { requireParentUser } from "@/lib/auth";
import { cn, minutesLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireParentUser();
  const children = await getChildren(user.id);
  const dashboards = (await Promise.all(children.map((child) => getChildDashboard(user.id, child.id)))).filter(Boolean);
  const sessions = dashboards.flatMap((dashboard) => dashboard!.analytics.sessions);
  const days = calendarActivity(sessions);

  return (
    <AppShell>
      <div className="grid gap-6">
        <header><h1 className="text-3xl font-semibold tracking-tight">Calendar</h1><p className="mt-1 text-sm text-stone-600">{format(new Date(), "MMMM yyyy")}</p></header>
        <Card>
          <CardTitle>Monthly activity</CardTitle>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {days.map((day) => (
              <details key={day.key} className={cn("min-h-20 rounded-md border p-2", day.studied ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-stone-100")}>
                <summary className="cursor-pointer list-none text-sm font-medium">{format(day.date, "d")}</summary>
                <p className="mt-2 text-xs text-stone-600">{day.studied ? minutesLabel(day.totalMinutes) : "No activity"}</p>
                {day.sessions.length ? <p className="text-xs text-stone-500">{day.sessions.length} sessions</p> : null}
              </details>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
