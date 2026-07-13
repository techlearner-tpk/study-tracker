import { describe, expect, it } from "vitest";
import { AssignmentStatus } from "@prisma/client";
import { assignmentDisplayStatus, groupAssignments } from "@/features/assignments/service";

describe("assignment service", () => {
  it("groups assignments by timeline and status", () => {
    const now = new Date("2026-07-13T10:00:00.000Z");
    const assignments = [
      {
        id: "a1",
        status: AssignmentStatus.PLANNED,
        dueDate: new Date("2026-07-13T18:00:00.000Z"),
        plannedDate: null,
      },
      {
        id: "a2",
        status: AssignmentStatus.PLANNED,
        dueDate: new Date("2026-07-15T18:00:00.000Z"),
        plannedDate: null,
      },
      {
        id: "a3",
        status: AssignmentStatus.PLANNED,
        dueDate: new Date("2026-07-12T18:00:00.000Z"),
        plannedDate: null,
      },
      {
        id: "a4",
        status: AssignmentStatus.COMPLETED,
        dueDate: new Date("2026-07-12T18:00:00.000Z"),
        plannedDate: null,
      },
    ] as const;

    expect(assignmentDisplayStatus(assignments[0], now)).toBe("PLANNED_TODAY");
    expect(assignmentDisplayStatus(assignments[2], now)).toBe("OVERDUE");

    const groups = groupAssignments(assignments as never, now);
    expect(groups.find((group) => group.key === "today")?.items).toHaveLength(1);
    expect(groups.find((group) => group.key === "upcoming")?.items).toHaveLength(1);
    expect(groups.find((group) => group.key === "overdue")?.items).toHaveLength(1);
    expect(groups.find((group) => group.key === "completed")?.items).toHaveLength(1);
  });
});
