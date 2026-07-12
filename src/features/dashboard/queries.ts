import { LearningStatus } from "@prisma/client";
import { isSameDay, startOfMonth, startOfWeek } from "date-fns";
import { getOwnedChild } from "@/lib/ownership";
import { prisma } from "@/lib/prisma";
import { ActivitySession, calculateTopicProgress, currentStudyStreak, habitGoalProgress, longestStudyStreak } from "@/lib/analytics";

export type ChildWithStudyTree = Awaited<ReturnType<typeof getOwnedChild>>;

export async function getChildren(userId: string) {
  return prisma.child.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

export async function getChildDashboard(userId: string, childId: string) {
  const child = await getOwnedChild(userId, childId);
  return { child, analytics: buildChildAnalytics(child) };
}

export function flattenTopics(child: ChildWithStudyTree) {
  return child.subjects.flatMap((subject) =>
    subject.chapters.flatMap((chapter) =>
      chapter.topics.map((topic) => ({
        ...topic,
        chapter,
        subject,
      })),
    ),
  );
}

export function sessionsForChild(child: ChildWithStudyTree): ActivitySession[] {
  return flattenTopics(child).flatMap((topic) => [
    ...topic.studySessions.map((session) => ({
      date: session.startTime,
      durationMinutes: session.durationMinutes,
      type: "study" as const,
    })),
    ...topic.practiceSessions.map((session) => ({
      date: session.date,
      durationMinutes: session.durationMinutes,
      type: "practice" as const,
    })),
    ...topic.revisionSessions.map((session) => ({
      date: session.date,
      durationMinutes: session.durationMinutes,
      type: "revision" as const,
    })),
  ]);
}

export function buildChildAnalytics(child: ChildWithStudyTree) {
  const topics = flattenTopics(child);
  const sessions = sessionsForChild(child);
  const today = new Date();
  const studySessions = sessions.filter((session) => session.type === "study");
  const practiceSessions = sessions.filter((session) => session.type === "practice");
  const revisionSessions = sessions.filter((session) => session.type === "revision");
  const topicProgress = calculateTopicProgress(topics.map((topic) => ({ status: topic.status })));
  const todayStudyTime = studySessions
    .filter((session) => isSameDay(session.date, today))
    .reduce((total, session) => total + session.durationMinutes, 0);

  const recentlyStudied = topics
    .map((topic) => ({
      id: topic.id,
      name: topic.name,
      subjectName: topic.subject.name,
      lastStudied: topic.studySessions[0]?.startTime ?? null,
    }))
    .filter((topic) => topic.lastStudied)
    .sort((a, b) => Number(b.lastStudied) - Number(a.lastStudied))
    .slice(0, 5);

  return {
    topics,
    sessions,
    todayStudyTime,
    currentStreak: currentStudyStreak(sessions),
    longestStreak: longestStudyStreak(sessions),
    topicProgress,
    practiceCount: practiceSessions.length,
    revisionCount: revisionSessions.length,
    recentlyStudied,
    habitGoals: child.habitGoals.map((goal) => ({
      ...goal,
      progress: habitGoalProgress(goal.metric, goal.targetValue, sessions),
    })),
    outcomeGoals: child.outcomeGoals.map((goal) => {
      if (goal.type === "COMPLETE_TOPIC") {
        const target = topics.find((topic) => topic.id === goal.targetTopicId);
        const done = target?.status === LearningStatus.COMPLETED;
        return { ...goal, progress: done ? 100 : 0, remainingWork: done ? "Complete" : "Topic pending" };
      }
      const targetChapter = child.subjects.flatMap((subject) => subject.chapters).find((chapter) => chapter.id === goal.targetChapterId);
      const chapterTopics = targetChapter?.topics ?? [];
      const progress = calculateTopicProgress(chapterTopics.map((topic) => ({ status: topic.status })));
      return { ...goal, progress: progress.progress, remainingWork: `${progress.pending + progress.inProgress} topics left` };
    }),
    weekStart: startOfWeek(today, { weekStartsOn: 1 }),
    monthStart: startOfMonth(today),
  };
}
