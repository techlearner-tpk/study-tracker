import { differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import { percent } from "./utils";

export type ActivitySession = {
  date: Date;
  durationMinutes: number;
  type: "study" | "practice" | "revision";
};

export type TopicProgressInput = {
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
};

export function calculateTopicProgress(topics: TopicProgressInput[]) {
  const completed = topics.filter((topic) => topic.status === "COMPLETED").length;
  const inProgress = topics.filter((topic) => topic.status === "IN_PROGRESS").length;
  const pending = topics.length - completed - inProgress;

  return {
    total: topics.length,
    completed,
    inProgress,
    pending,
    progress: percent(completed, topics.length),
  };
}

export function currentStudyStreak(sessions: ActivitySession[], today = new Date()) {
  const studyDays = new Set(
    sessions
      .filter((session) => session.type === "study" && session.durationMinutes > 0)
      .map((session) => format(startOfDay(session.date), "yyyy-MM-dd")),
  );

  let streak = 0;
  let cursor = startOfDay(today);

  while (studyDays.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

export function longestStudyStreak(sessions: ActivitySession[]) {
  const orderedDays = Array.from(
    new Set(
      sessions
        .filter((session) => session.type === "study" && session.durationMinutes > 0)
        .map((session) => format(startOfDay(session.date), "yyyy-MM-dd")),
    ),
  ).sort();

  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const day of orderedDays) {
    const date = new Date(`${day}T00:00:00`);
    current = previous && differenceInCalendarDays(date, previous) === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  }

  return longest;
}

export function habitGoalProgress(
  metric: "STUDY_MINUTES_DAILY" | "STUDY_DAYS_WEEKLY" | "STUDY_SESSION_DAILY",
  targetValue: number,
  sessions: ActivitySession[],
  today = new Date(),
) {
  if (metric === "STUDY_DAYS_WEEKLY") {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const studiedDays = new Set(
      sessions
        .filter((session) => session.type === "study" && session.date >= weekStart && session.date <= weekEnd)
        .map((session) => format(startOfDay(session.date), "yyyy-MM-dd")),
    ).size;

    return {
      current: studiedDays,
      target: targetValue,
      successPercentage: percent(studiedDays, targetValue),
    };
  }

  const todayStudySessions = sessions.filter(
    (session) => session.type === "study" && isSameDay(session.date, today),
  );
  const current =
    metric === "STUDY_SESSION_DAILY"
      ? todayStudySessions.length
      : todayStudySessions.reduce((total, session) => total + session.durationMinutes, 0);

  return {
    current,
    target: targetValue,
    successPercentage: percent(current, targetValue),
  };
}

export function calendarActivity(sessions: ActivitySession[], month = new Date()) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });

  return days.map((day) => {
    const daySessions = sessions.filter((session) => isSameDay(session.date, day));
    return {
      date: day,
      key: format(day, "yyyy-MM-dd"),
      studied: daySessions.some((session) => session.type === "study"),
      totalMinutes: daySessions.reduce((total, session) => total + session.durationMinutes, 0),
      sessions: daySessions,
    };
  });
}

