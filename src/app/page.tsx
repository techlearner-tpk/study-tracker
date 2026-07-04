import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Clock, Plus, Target } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ChildForm, KidInviteForm } from "@/features/children/components";
import { getChildren, getChildDashboard } from "@/features/dashboard/queries";
import { requireCurrentUser } from "@/lib/auth";
import { minutesLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireCurrentUser();
  if (user.role === "KID") {
    redirect("/kid");
  }
  const children = await getChildren(user.id);
  const firstDashboard = children[0] ? await getChildDashboard(user.id, children[0].id) : null;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-800">Learn. Practice. Revise. Master.</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Study Tracker</h1>
          </div>
          {children[0] ? (
            <Link href={`/children/${children[0].id}`}>
              <Button type="button">Open dashboard</Button>
            </Link>
          ) : null}
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {children.map((child) => (
            <Link key={child.id} href={`/children/${child.id}`}>
              <Card className="h-full hover:border-emerald-300">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{child.name}</CardTitle>
                    <p className="mt-1 text-sm text-stone-600">Class {child.className}</p>
                  </div>
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: child.themeColor ?? "#4f766a" }} />
                </div>
              </Card>
            </Link>
          ))}
          <Card>
            <CardTitle className="flex items-center gap-2"><Plus size={16} /> Add child</CardTitle>
            <div className="mt-4">
              <ChildForm showKidEmail />
            </div>
          </Card>
          <KidInviteForm />
        </section>

        {firstDashboard ? (
          <section className="grid gap-4 md:grid-cols-4">
            <Metric icon={<Clock size={18} />} label="Today's study" value={minutesLabel(firstDashboard.analytics.todayStudyTime)} />
            <Metric icon={<Target size={18} />} label="Current streak" value={`${firstDashboard.analytics.currentStreak} days`} />
            <Metric icon={<BookOpen size={18} />} label="Completed topics" value={`${firstDashboard.analytics.topicProgress.completed}`} />
            <Metric icon={<BookOpen size={18} />} label="Need attention" value={`${firstDashboard.analytics.topicProgress.pending}`} />
          </section>
        ) : null}

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

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-emerald-800">{icon}<span className="text-sm font-medium">{label}</span></div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
