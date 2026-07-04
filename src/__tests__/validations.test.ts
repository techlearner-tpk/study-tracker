import { describe, expect, it } from "vitest";
import { deleteChildSchema, practiceSessionSchema, studySessionSchema, topicSchema } from "@/lib/validations";

describe("validations", () => {
  it("allows optional topic confidence", () => {
    const parsed = topicSchema.parse({
      chapterId: "chapter-1",
      name: "Integers",
      status: "NOT_STARTED",
      confidenceRating: "",
    });

    expect(parsed.confidenceRating).toBeUndefined();
  });

  it("rejects study sessions with an end before the start", () => {
    expect(() =>
      studySessionSchema.parse({
        topicId: "topic-1",
        startTime: "2026-07-02T11:00:00",
        endTime: "2026-07-02T10:00:00",
        durationMinutes: 30,
      }),
    ).toThrow();
  });

  it("rejects practice results where correct answers exceed attempted", () => {
    expect(() =>
      practiceSessionSchema.parse({
        topicId: "topic-1",
        date: "2026-07-02",
        durationMinutes: 20,
        questionsAttempted: 5,
        questionsCorrect: 6,
      }),
    ).toThrow();
  });

  it("requires exact child-name confirmation for child deletion", () => {
    expect(
      deleteChildSchema.safeParse({
        childId: "child-1",
        childName: "Tisha",
        confirmation: "Tisha",
      }).success,
    ).toBe(true);

    expect(
      deleteChildSchema.safeParse({
        childId: "child-1",
        childName: "Tisha",
        confirmation: "tisha",
      }).success,
    ).toBe(false);
  });
});

