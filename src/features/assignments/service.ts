import { AssignmentPriority, AssignmentSource, AssignmentStatus, AssignmentType, Prisma } from "@prisma/client";
import { endOfDay, isSameDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getOwnedChild } from "@/lib/ownership";
import { isDemoName } from "@/lib/display";

export type AssignmentTree = Prisma.AssignmentGetPayload<{
  include: {
    child: true;
    topic: {
      include: {
        chapter: {
          include: {
            subject: true;
          };
        };
      };
    };
    assignedBy: true;
    studySessions: true;
    practiceSessions: true;
    revisionSessions: true;
  };
}>;

export type AssignmentGroupKey = "today" | "upcoming" | "inProgress" | "completed" | "overdue";

export type AssignmentGroup = {
  key: AssignmentGroupKey;
  label: string;
  items: AssignmentTree[];
};

export type AssignmentProgress = {
  label: string;
  current: number;
  target: number;
  percent: number;
};

export type AssignmentSelectionChild = {
  id: string;
  name: string;
  className: string;
  subjects: {
    id: string;
    name: string;
    chapters: {
      id: string;
      name: string;
      topics: {
        id: string;
        name: string;
      }[];
    }[];
  }[];
};

export function assignmentDisplayStatus(assignment: Pick<AssignmentTree, "status" | "dueDate" | "plannedDate">, now = new Date()) {
  if (assignment.status === AssignmentStatus.COMPLETED) return "COMPLETED";
  if (assignment.status === AssignmentStatus.SKIPPED) return "SKIPPED";
  if (assignment.status === AssignmentStatus.IN_PROGRESS) return "IN_PROGRESS";

  const due = assignment.dueDate ?? assignment.plannedDate;
  if (due && endOfDay(due) < now) return "OVERDUE";
  if (due && isSameDay(due, now)) return "PLANNED_TODAY";
  return "PLANNED";
}

export function assignmentSourceLabel(source: AssignmentSource) {
  return source === AssignmentSource.PARENT ? "Parent-made" : "Self-made";
}

export function assignmentTypeLabel(type: AssignmentType) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function assignmentPriorityLabel(priority: AssignmentPriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function assignmentTopicPath(assignment: AssignmentTree) {
  return [assignment.topic.chapter.subject.name, assignment.topic.chapter.name, assignment.topic.name];
}

export function assignmentProgress(assignment: AssignmentTree): AssignmentProgress {
  if (assignment.type === AssignmentType.TEST) {
    const target = assignment.maximumMarks ?? assignment.questionTarget ?? 1;
    const current = assignment.score ?? 0;
    return { label: "score", current, target, percent: target ? Math.min(100, Math.round((current / target) * 100)) : 0 };
  }

  if (assignment.type === AssignmentType.STUDY) {
    const target = assignment.studySessionTarget ?? 1;
    const current = assignment.studySessions.length;
    return { label: "study sessions", current, target, percent: Math.min(100, Math.round((current / target) * 100)) };
  }

  if (assignment.type === AssignmentType.PRACTICE) {
    const target = assignment.questionTarget ?? assignment.practiceSessionTarget ?? 1;
    const current = assignment.practiceSessions.reduce((sum, session) => sum + (session.questionsAttempted ?? 1), 0);
    return { label: "questions", current, target, percent: Math.min(100, Math.round((current / target) * 100)) };
  }

  const target = assignment.durationMinutes ?? 1;
  const current = assignment.revisionSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  return { label: "minutes", current, target, percent: Math.min(100, Math.round((current / target) * 100)) };
}

export function assignmentStatusTone(status: string) {
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-900";
  if (status === "OVERDUE") return "bg-red-100 text-red-900";
  if (status === "IN_PROGRESS") return "bg-amber-100 text-amber-900";
  if (status === "SKIPPED") return "bg-stone-100 text-stone-700";
  return "bg-sky-100 text-sky-900";
}

function groupKeyForAssignment(assignment: AssignmentTree, now = new Date()): AssignmentGroupKey {
  const displayStatus = assignmentDisplayStatus(assignment, now);
  if (displayStatus === "COMPLETED") return "completed";
  if (displayStatus === "OVERDUE") return "overdue";
  if (displayStatus === "IN_PROGRESS") return "inProgress";
  const due = assignment.dueDate ?? assignment.plannedDate;
  if (due && isSameDay(due, now)) return "today";
  return "upcoming";
}

export function groupAssignments(assignments: AssignmentTree[], now = new Date()): AssignmentGroup[] {
  const grouped: Record<AssignmentGroupKey, AssignmentTree[]> = {
    today: [],
    upcoming: [],
    inProgress: [],
    completed: [],
    overdue: [],
  };

  for (const assignment of assignments) {
    grouped[groupKeyForAssignment(assignment, now)].push(assignment);
  }

  const sortByDueDate = (left: AssignmentTree, right: AssignmentTree) =>
    Number(left.dueDate ?? left.plannedDate ?? 0) - Number(right.dueDate ?? right.plannedDate ?? 0) ||
    Number(right.updatedAt) - Number(left.updatedAt);

  return [
    { key: "today", label: "Today", items: grouped.today.sort(sortByDueDate) },
    { key: "upcoming", label: "Upcoming", items: grouped.upcoming.sort(sortByDueDate) },
    { key: "inProgress", label: "In Progress", items: grouped.inProgress.sort(sortByDueDate) },
    { key: "completed", label: "Completed", items: grouped.completed.sort(sortByDueDate) },
    { key: "overdue", label: "Overdue", items: grouped.overdue.sort(sortByDueDate) },
  ];
}

export async function loadAssignmentsForParent(userId: string) {
  const children = await prisma.child.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  const visibleChildren = process.env.NODE_ENV === "production" ? children.filter((child) => !isDemoName(child.name)) : children;
  if (!visibleChildren.length) return [];

  const assignments = await prisma.assignment.findMany({
    where: {
      childId: { in: visibleChildren.map((child) => child.id) },
    },
    include: {
      child: true,
      topic: {
        include: {
          chapter: {
            include: {
              subject: true,
            },
          },
        },
      },
      assignedBy: true,
      studySessions: true,
      practiceSessions: true,
      revisionSessions: true,
    },
    orderBy: [{ dueDate: "asc" }, { plannedDate: "asc" }, { createdAt: "desc" }],
  });

  return assignments;
}

export async function loadAssignmentsForKid(childId: string) {
  return prisma.assignment.findMany({
    where: { childId },
    include: {
      child: true,
      topic: {
        include: {
          chapter: {
            include: {
              subject: true,
            },
          },
        },
      },
      assignedBy: true,
      studySessions: true,
      practiceSessions: true,
      revisionSessions: true,
    },
    orderBy: [{ dueDate: "asc" }, { plannedDate: "asc" }, { createdAt: "desc" }],
  });
}

export function mapChildToAssignmentSelectionChild(child: Awaited<ReturnType<typeof getOwnedChild>>): AssignmentSelectionChild {
  return {
    id: child.id,
    name: child.name,
    className: child.className,
    subjects: child.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      chapters: subject.chapters.map((chapter) => ({
        id: chapter.id,
        name: chapter.name,
        topics: chapter.topics.map((topic) => ({
          id: topic.id,
          name: topic.name,
        })),
      })),
    })),
  };
}

export async function loadAssignmentSelectionChildrenForParent(userId: string): Promise<AssignmentSelectionChild[]> {
  const children = await prisma.child.findMany({
    where: { userId },
    include: {
      subjects: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          chapters: {
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            include: {
              topics: {
                orderBy: [{ order: "asc" }, { createdAt: "asc" }],
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const visibleChildren = process.env.NODE_ENV === "production" ? children.filter((child) => !isDemoName(child.name)) : children;

  return visibleChildren.map((child) => ({
    id: child.id,
    name: child.name,
    className: child.className,
    subjects: child.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      chapters: subject.chapters.map((chapter) => ({
        id: chapter.id,
        name: chapter.name,
        topics: chapter.topics.map((topic) => ({
          id: topic.id,
          name: topic.name,
        })),
      })),
    })),
  }));
}

export async function loadAssignmentSelectionChildForKid(userId: string, childId: string): Promise<AssignmentSelectionChild | null> {
  const child = await getOwnedChild(userId, childId);
  return mapChildToAssignmentSelectionChild(child);
}

export function assignmentTimelineDescription(assignment: AssignmentTree) {
  const progress = assignmentProgress(assignment);
  return `${progress.current} ${progress.label} of ${progress.target}`;
}
