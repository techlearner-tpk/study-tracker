import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Target, Trophy } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildChildAnalytics } from "@/features/dashboard/queries";
import { requireKidUser } from "@/lib/auth";
import { getOwnedChild } from "@/lib/ownership";
import { minutesLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KidPage() {
  const user = await requireKidUser();
  if (!user.childId) notFound();

  const child = await getOwnedChild(user.id, user.childId);
  const analytics = buildChildAnalytics(child);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-800">Kid portal</p>
            <h1 className="text-3xl font-semibold tracking-tight">{child.name}</h1>
          </div>
          <UserButton />
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric icon={<Clock size={18} />} label="Today" value={minutesLabel(analytics.todayStudyTime)} />
          <Metric icon={<Target size={18} />} label="Current streak" value={`${analytics.currentStreak} days`} />
          <Metric icon={<Trophy size={18} />} label="Completed topics" value={`${analytics.topicProgress.completed}`} />
        </section>

        <section>
          <Link href="/kid/assignments">
            <Button type="button" variant="secondary">Open assignments</Button>
          </Link>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle>Progress</CardTitle>
            <div className="mt-4 grid gap-4">
              {analytics.habitGoals.map((goal) => (
                <div key={goal.id} className="grid gap-2">
                  <div className="flex justify-between text-sm">
                    <span>{goal.title}</span>
                    <span>{goal.progress.current}/{goal.progress.target}</span>
                  </div>
                  <Progress value={goal.progress.successPercentage} />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>Recent topics</CardTitle>
            <div className="mt-4 grid gap-2">
              {analytics.recentlyStudied.map((topic) => (
                <Link key={topic.id} href={`/kid/topics/${topic.id}`} className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm hover:bg-stone-50">
                  {topic.name}
                  <span className="block text-xs text-stone-500">{topic.subjectName}</span>
                </Link>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
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
