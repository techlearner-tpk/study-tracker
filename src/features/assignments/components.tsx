import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { PracticeSessionForm } from "@/features/practice-sessions/components";
import { RevisionSessionForm } from "@/features/revision-sessions/components";
import { StudySessionForm } from "@/features/study-sessions/components";
import { completeAssignment, saveAssignmentScore, skipAssignment, startAssignment } from "./actions";
import {
  assignmentDisplayStatus,
  assignmentPriorityLabel,
  assignmentProgress,
  assignmentSourceLabel,
  assignmentStatusTone,
  assignmentTimelineDescription,
  assignmentTopicPath,
  assignmentTypeLabel,
  type AssignmentGroup,
  type AssignmentTree,
} from "./service";

function dueLabel(assignment: AssignmentTree) {
  const date = assignment.dueDate ?? assignment.plannedDate;
  if (!date) return "No due date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function subjectColorForAssignment(assignment: AssignmentTree) {
  return assignment.topic.chapter.subject.color ?? "#4f766a";
}

export function AssignmentCard({
  assignment,
  href,
}: {
  assignment: AssignmentTree;
  href: string;
}) {
  const progress = assignmentProgress(assignment);
  const status = assignmentDisplayStatus(assignment);
  const [subjectName, chapterName, topicName] = assignmentTopicPath(assignment);
  const subjectColor = subjectColorForAssignment(assignment);

  return (
    <Card className="border-l-4 p-4" style={{ borderLeftColor: subjectColor }}>
      <div className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectColor }} />
              {subjectName}
            </p>
            <p className="text-sm text-stone-600">{chapterName}</p>
            <p className="truncate text-base font-medium text-stone-900">{topicName}</p>
          </div>
          <div className="grid justify-items-end gap-1">
            <Badge className={assignmentStatusTone(status)}>{status.replaceAll("_", " ")}</Badge>
            <Badge>{assignmentTypeLabel(assignment.type)}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
          <span>{dueLabel(assignment)}</span>
          <span>|</span>
          <span>{assignmentSourceLabel(assignment.source)}</span>
          <span>|</span>
          <span>{assignmentPriorityLabel(assignment.priority)}</span>
        </div>

        <div className="grid gap-1">
          <div className="flex justify-between text-xs text-stone-600">
            <span>{assignmentTimelineDescription(assignment)}</span>
            <span>{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-xs text-stone-500">
            <p className="truncate">{assignment.child.name}</p>
            {assignment.instructions ? <p className="truncate">{assignment.instructions}</p> : null}
          </div>
          <Link href={href}>
            <Button type="button" variant="secondary">
              Open
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function AssignmentGroupSection({
  group,
  hrefBase,
}: {
  group: AssignmentGroup;
  hrefBase: string;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">{group.label}</CardTitle>
        <Badge>{group.items.length}</Badge>
      </div>
      <div className="grid gap-3">
        {group.items.length ? (
          group.items.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} href={`${hrefBase}/${assignment.id}`} />)
        ) : (
          <Card className="p-4">
            <p className="text-sm text-stone-600">No assignments here.</p>
          </Card>
        )}
      </div>
    </section>
  );
}

export function AssignmentDetailView({
  assignment,
  hrefBase,
}: {
  assignment: AssignmentTree;
  hrefBase: string;
}) {
  const progress = assignmentProgress(assignment);
  const [subjectName, chapterName, topicName] = assignmentTopicPath(assignment);
  const subjectColor = subjectColorForAssignment(assignment);
  const timeline = [
    ...assignment.studySessions.map((session) => ({ type: "Study", date: session.startTime, minutes: session.durationMinutes, notes: session.notes })),
    ...assignment.practiceSessions.map((session) => ({ type: "Practice", date: session.date, minutes: session.durationMinutes, notes: session.notes })),
    ...assignment.revisionSessions.map((session) => ({ type: "Revision", date: session.date, minutes: session.durationMinutes, notes: session.notes })),
  ].sort((a, b) => Number(b.date) - Number(a.date));

  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={assignmentStatusTone(assignmentDisplayStatus(assignment))}>{assignmentDisplayStatus(assignment).replaceAll("_", " ")}</Badge>
          <Badge>{assignmentTypeLabel(assignment.type)}</Badge>
          <Badge>{assignmentPriorityLabel(assignment.priority)}</Badge>
        </div>
        <div>
          <p className="text-sm text-stone-600">
            {assignment.child.name} | {assignment.child.className}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{topicName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectColor }} />
              {subjectName}
            </span>
            <span>|</span>
            <span>{chapterName}</span>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardTitle>Progress</CardTitle>
          <div className="mt-4 grid gap-3">
            <div className="flex justify-between text-sm text-stone-600">
              <span>{assignmentTimelineDescription(assignment)}</span>
              <span>{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} />
            <div className="grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
              <p>Source: {assignmentSourceLabel(assignment.source)}</p>
              <p>Due: {assignment.dueDate ? format(assignment.dueDate, "PP") : "No due date"}</p>
              <p>Planned: {assignment.plannedDate ? format(assignment.plannedDate, "PP") : "No planned date"}</p>
              <p>Assigned by: {assignment.assignedBy.name}</p>
            </div>
            {assignment.instructions ? <p className="rounded-md bg-stone-50 p-3 text-sm text-stone-700">{assignment.instructions}</p> : null}
            <div className="flex flex-wrap gap-2">
              <form action={startAssignment}>
                <input type="hidden" name="id" value={assignment.id} />
                <Button type="submit" variant="secondary">
                  Start
                </Button>
              </form>
              <form action={completeAssignment}>
                <input type="hidden" name="id" value={assignment.id} />
                <Button type="submit">Mark completed</Button>
              </form>
              <form action={skipAssignment}>
                <input type="hidden" name="id" value={assignment.id} />
                <Button type="submit" variant="ghost">
                  Skip
                </Button>
              </form>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Linked topic</CardTitle>
          <div className="mt-4 grid gap-3 text-sm text-stone-600">
            <p className="flex flex-wrap items-center gap-2">
              <span>{assignment.child.name}</span>
              <span>|</span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectColor }} />
                {assignment.topic.chapter.subject.name}
              </span>
            </p>
            <p>{assignment.topic.chapter.name}</p>
            <Link href={`${hrefBase.replace(/\/assignments$/, "")}/topics/${assignment.topic.id}`} className="text-emerald-800 hover:underline">
              Open topic
            </Link>
          </div>
        </Card>
      </section>

      {assignment.type === "TEST" ? (
        <Card>
          <CardTitle>Test score</CardTitle>
          <form action={saveAssignmentScore} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <input type="hidden" name="id" value={assignment.id} />
            <Label>
              Score
              <Input name="score" type="number" min="0" defaultValue={assignment.score ?? ""} />
            </Label>
            <Button type="submit">Save score</Button>
          </form>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Study session</CardTitle>
          <div className="mt-4">
            <StudySessionForm topicId={assignment.topicId} assignmentId={assignment.id} />
          </div>
        </Card>
        <Card>
          <CardTitle>Practice session</CardTitle>
          <div className="mt-4">
            <PracticeSessionForm topicId={assignment.topicId} assignmentId={assignment.id} />
          </div>
        </Card>
        <Card>
          <CardTitle>Revision session</CardTitle>
          <div className="mt-4">
            <RevisionSessionForm topicId={assignment.topicId} assignmentId={assignment.id} />
          </div>
        </Card>
      </section>

      <Card>
        <CardTitle>Activity</CardTitle>
        <div className="mt-4 grid gap-3">
          {timeline.length ? (
            timeline.map((item, index) => (
              <div key={`${item.type}-${index}`} className="rounded-md border border-stone-200 p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.type}</span>
                  <span>{item.minutes} min</span>
                </div>
                <p className="text-xs text-stone-500">{format(item.date, "PP p")}</p>
                {item.notes ? <p className="mt-2 text-sm text-stone-600">{item.notes}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-600">No activity yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
