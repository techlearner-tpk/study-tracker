import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireParentUser: vi.fn(),
  transaction: vi.fn(),
  childCreate: vi.fn(),
  subjectCreateMany: vi.fn(),
  userUpsert: vi.fn(),
  snapshotCurriculumToChild: vi.fn(),
  clerkClient: vi.fn(),
  createInvitation: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireParentUser: mocks.requireParentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/features/curriculum/service", () => ({
  snapshotCurriculumToChild: mocks.snapshotCurriculumToChild,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: mocks.clerkClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createChild } from "@/features/children/actions";

describe("create child curriculum integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireParentUser.mockResolvedValue({ id: "parent_1" });
    mocks.childCreate.mockResolvedValue({ id: "child_1" });
    mocks.subjectCreateMany.mockResolvedValue({ count: 6 });
    mocks.userUpsert.mockResolvedValue({ id: "kid_1" });
    mocks.snapshotCurriculumToChild.mockResolvedValue({ id: "assignment_1" });
    mocks.clerkClient.mockResolvedValue({
      invitations: {
        createInvitation: mocks.createInvitation,
      },
    });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        child: {
          create: mocks.childCreate,
        },
        subject: {
          createMany: mocks.subjectCreateMany,
        },
        user: {
          upsert: mocks.userUpsert,
        },
      }),
    );
  });

  it("keeps the existing add kid flow working without a curriculum", async () => {
    const formData = new FormData();
    formData.set("name", "Aarav");
    formData.set("className", "5");
    formData.set("school", "Sanskriti");
    formData.set("themeColor", "#4f766a");

    await expect(createChild(formData)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

    expect(mocks.childCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "parent_1",
          name: "Aarav",
          className: "5",
        }),
      }),
    );
    expect(mocks.subjectCreateMany).toHaveBeenCalled();
    expect(mocks.snapshotCurriculumToChild).not.toHaveBeenCalled();
  });

  it("snapshots the selected curriculum when one is chosen", async () => {
    const formData = new FormData();
    formData.set("name", "Aarav");
    formData.set("className", "Class 5");
    formData.set("curriculumVersionId", "version_1");
    formData.set("curriculumClassId", "class_1");
    formData.append("selectedSubjectIds", "subject_math");

    await expect(createChild(formData)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

    expect(mocks.snapshotCurriculumToChild).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        childId: "child_1",
        curriculumVersionId: "version_1",
        curriculumClassId: "class_1",
        selectedSubjectIds: ["subject_math"],
      }),
    );
    expect(mocks.subjectCreateMany).not.toHaveBeenCalled();
  });

  it("rolls back the child creation when the curriculum snapshot fails", async () => {
    mocks.snapshotCurriculumToChild.mockRejectedValueOnce(new Error("snapshot failed"));

    const formData = new FormData();
    formData.set("name", "Aarav");
    formData.set("className", "Class 5");
    formData.set("curriculumVersionId", "version_1");
    formData.set("curriculumClassId", "class_1");
    formData.append("selectedSubjectIds", "subject_math");
    formData.set("kidEmail", "kid@example.com");

    await expect(createChild(formData)).rejects.toThrow("snapshot failed");
    expect(mocks.createInvitation).not.toHaveBeenCalled();
    expect(mocks.subjectCreateMany).not.toHaveBeenCalled();
  });
});
