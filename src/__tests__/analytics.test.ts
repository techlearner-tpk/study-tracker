import { describe, expect, it } from "vitest";
import { calculateTopicProgress, calendarActivity, currentStudyStreak, habitGoalProgress, longestStudyStreak } from "@/lib/analytics";

describe("analytics", () => {
  it("calculates topic progress", () => {
    expect(
      calculateTopicProgress([
        { status: "COMPLETED" },
        { status: "IN_PROGRESS" },
        { status: "NOT_STARTED" },
        { status: "COMPLETED" },
      ]),
    ).toEqual({
      total: 4,
      completed: 2,
      inProgress: 1,
      pending: 1,
      progress: 50,
    });
  });

  it("calculates current and longest study streaks", () => {
    const sessions = [
      { type: "study" as const, date: new Date("2026-07-02T10:00:00"), durationMinutes: 30 },
      { type: "study" as const, date: new Date("2026-07-01T10:00:00"), durationMinutes: 20 },
      { type: "study" as const, date: new Date("2026-06-29T10:00:00"), durationMinutes: 10 },
      { type: "study" as const, date: new Date("2026-06-28T10:00:00"), durationMinutes: 10 },
    ];

    expect(currentStudyStreak(sessions, new Date("2026-07-02T12:00:00"))).toBe(2);
    expect(longestStudyStreak(sessions)).toBe(2);
  });

  it("calculates daily study minute habit progress", () => {
    const result = habitGoalProgress(
      "STUDY_MINUTES_DAILY",
      30,
      [
        { type: "study" as const, date: new Date("2026-07-02T10:00:00"), durationMinutes: 15 },
        { type: "study" as const, date: new Date("2026-07-02T11:00:00"), durationMinutes: 20 },
      ],
      new Date("2026-07-02T12:00:00"),
    );

    expect(result).toEqual({ current: 35, target: 30, successPercentage: 117 });
  });

  it("marks studied calendar days", () => {
    const days = calendarActivity(
      [{ type: "study" as const, date: new Date("2026-07-02T10:00:00"), durationMinutes: 25 }],
      new Date("2026-07-15T12:00:00"),
    );

    const julySecond = days.find((day) => day.key === "2026-07-02");
    expect(julySecond?.studied).toBe(true);
    expect(julySecond?.totalMinutes).toBe(25);
  });
});

