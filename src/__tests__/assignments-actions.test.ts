import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("redirect");
  }),
  requireCurrentUser: vi.fn(),
  getOwnedChild: vi.fn(),
  getOwnedTopic: vi.fn(),
  getOwnedAssignment: vi.fn(),
  prismaAssignmentFindFirst: vi.fn(),
  prismaAssignmentCreate: vi.fn(),
  prismaAssignmentUpdate: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/ownership", () => ({
  getOwnedChild: mocks.getOwnedChild,
  getOwnedTopic: mocks.getOwnedTopic,
  getOwnedAssignment: mocks.getOwnedAssignment,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assignment: {
      findFirst: mocks.prismaAssignmentFindFirst,
      create: mocks.prismaAssignmentCreate,
      update: mocks.prismaAssignmentUpdate,
    },
  },
}));

import { createAssignment, saveAssignmentScore } from "@/features/assignments/actions";

describe("assignment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({ id: "parent_1", role: "PARENT", childId: null });
    mocks.getOwnedChild.mockResolvedValue({ id: "child_1" });
    mocks.getOwnedTopic.mockResolvedValue({
      id: "topic_1",
      chapter: {
        subject: {
          child: {
            id: "child_1",
          },
        },
      },
    });
    mocks.getOwnedAssignment.mockResolvedValue({
      id: "assignment_1",
      childId: "child_1",
      topicId: "topic_1",
      type: "TEST",
      child: { id: "child_1" },
    });
    mocks.prismaAssignmentFindFirst.mockResolvedValue(null);
    mocks.prismaAssignmentCreate.mockResolvedValue({ id: "assignment_1" });
    mocks.prismaAssignmentUpdate.mockResolvedValue({ id: "assignment_1" });
  });

  it("creates an assignment for a parent and redirects to the detail page", async () => {
    const formData = new FormData();
    formData.set("childId", "child_1");
    formData.set("topicId", "topic_1");
    formData.set("type", "STUDY");
    formData.set("priority", "HIGH");
    formData.set("studySessionTarget", "2");

    await expect(createAssignment(formData)).rejects.toThrow("redirect");

    expect(mocks.prismaAssignmentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          childId: "child_1",
          topicId: "topic_1",
          type: "STUDY",
          isActive: true,
        },
      }),
    );
    expect(mocks.prismaAssignmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          childId: "child_1",
          assignedByUserId: "parent_1",
          source: "PARENT",
          type: "STUDY",
        }),
      }),
    );
  });

  it("blocks duplicate active assignments", async () => {
    mocks.prismaAssignmentFindFirst.mockResolvedValueOnce({ id: "existing" });

    const formData = new FormData();
    formData.set("childId", "child_1");
    formData.set("topicId", "topic_1");
    formData.set("type", "STUDY");

    await expect(createAssignment(formData)).rejects.toThrow("An active assignment already exists");
    expect(mocks.prismaAssignmentCreate).not.toHaveBeenCalled();
  });

  it("saves a test score only for test assignments", async () => {
    const formData = new FormData();
    formData.set("id", "assignment_1");
    formData.set("score", "18");

    await expect(saveAssignmentScore(formData)).rejects.toThrow("redirect");

    expect(mocks.prismaAssignmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "assignment_1" },
        data: { score: 18 },
      }),
    );
  });
});
