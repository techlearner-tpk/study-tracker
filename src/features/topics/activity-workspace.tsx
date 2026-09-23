import { format } from "date-fns";
import { BookOpen, Brain, RefreshCw } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { PracticeSessionForm } from "@/features/practice-sessions/components";
import { RevisionSessionForm } from "@/features/revision-sessions/components";
import { StudySessionForm } from "@/features/study-sessions/components";
import { getOwnedTopic } from "@/lib/ownership";
import { minutesLabel } from "@/lib/utils";

type OwnedTopic = Awaited<ReturnType<typeof getOwnedTopic>>;

const activityStyles = {
  Study: {
    icon: BookOpen,
    iconClassName: "bg-sky-50 text-sky-700",
  },
  Practice: {
    icon: Brain,
    iconClassName: "bg-amber-50 text-amber-700",
  },
  Revision: {
    icon: RefreshCw,
    iconClassName: "bg-violet-50 text-violet-700",
  },
} as const;

export function TopicActivityWorkspace({ topic }: { topic: OwnedTopic }) {
  const timeline = [
    ...topic.studySessions.map((session) => ({
      id: session.id,
      type: "Study" as const,
      date: session.startTime,
      minutes: session.durationMinutes,
      notes: session.notes,
    })),
    ...topic.practiceSessions.map((session) => ({
      id: session.id,
      type: "Practice" as const,
      date: session.date,
      minutes: session.durationMinutes,
      notes: session.notes,
    })),
    ...topic.revisionSessions.map((session) => ({
      id: session.id,
      type: "Revision" as const,
      date: session.date,
      minutes: session.durationMinutes,
      notes: session.notes,
    })),
  ].sort((left, right) => Number(right.date) - Number(left.date));

  return (
    <div className="grid gap-6">
      <section aria-labelledby="log-activity-heading" className="grid gap-4">
        <div>
          <h2 id="log-activity-heading" className="text-lg font-semibold text-slate-950">Log activity</h2>
          <p className="mt-1 text-sm text-slate-600">Keep study, practice, and revision progress together for this topic.</p>
        </div>

        <Card>
          <CardTitle>Study session</CardTitle>
          <div className="mt-4">
            <StudySessionForm topicId={topic.id} />
          </div>
        </Card>
        <Card>
          <CardTitle>Practice session</CardTitle>
          <div className="mt-4">
            <PracticeSessionForm topicId={topic.id} />
          </div>
        </Card>
        <Card>
          <CardTitle>Revision session</CardTitle>
          <div className="mt-4">
            <RevisionSessionForm topicId={topic.id} />
          </div>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Timeline of activity</CardTitle>
          <span className="text-xs text-slate-500">{timeline.length} {timeline.length === 1 ? "entry" : "entries"}</span>
        </div>
        <div className="mt-4 grid gap-3">
          {timeline.length ? (
            timeline.map((item) => {
              const style = activityStyles[item.type];
              const Icon = style.icon;

              return (
                <article key={`${item.type}-${item.id}`} className="flex gap-3 rounded-md border border-slate-200 bg-white p-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${style.iconClassName}`}>
                    <Icon aria-hidden="true" size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-950">{item.type}</span>
                      <span className="text-slate-600">{minutesLabel(item.minutes)}</span>
                    </div>
                    <p className="text-xs text-slate-500">{format(item.date, "PP p")}</p>
                    {item.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.notes}</p> : null}
                  </div>
                </article>
              );
            })
          ) : (
            <p className="text-sm text-slate-600">No activity yet. Log the first session above.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
