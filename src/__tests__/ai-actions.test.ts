import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  requireAdminUser: vi.fn(),
  requireParentUser: vi.fn(),
  prismaSubscriptionUpsert: vi.fn(),
  prismaAiSettingUpsert: vi.fn(),
  prismaChildFindFirstOrThrow: vi.fn(),
  submitTopicTest: vi.fn(),
  getAiSession: vi.fn(),
  resetAiUsage: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth", () => ({
  requireAdminUser: mocks.requireAdminUser,
  requireParentUser: mocks.requireParentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      upsert: mocks.prismaSubscriptionUpsert,
    },
    aiSetting: {
      upsert: mocks.prismaAiSettingUpsert,
    },
    child: {
      findFirstOrThrow: mocks.prismaChildFindFirstOrThrow,
    },
  },
}));

vi.mock("@/features/ai/service", () => ({
  submitTopicTest: mocks.submitTopicTest,
  getAiSession: mocks.getAiSession,
  resetAiUsage: mocks.resetAiUsage,
}));

import { activateFamilySubscriptionAction, resetAiUsageAction, saveAiSettingsAction, submitTopicTestAction } from "@/features/ai/actions";

describe("ai actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminUser.mockResolvedValue({ id: "parent_1" });
    mocks.requireParentUser.mockResolvedValue({ id: "parent_1" });
  });

  it("activates the family subscription for the parent", async () => {
    await activateFamilySubscriptionAction();

    expect(mocks.prismaSubscriptionUpsert).toHaveBeenCalledWith({
      where: { parentId: "parent_1" },
      update: expect.objectContaining({ status: "ACTIVE" }),
      create: expect.objectContaining({ parentId: "parent_1", status: "ACTIVE" }),
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/ai?subscription=activated");
  });

  it("saves AI settings", async () => {
    const formData = new FormData();
    formData.set("topicPromptLimit", "9");
    formData.set("testQuestionCount", "6");
    formData.set("maxUserPromptLength", "700");

    await saveAiSettingsAction(formData);

    expect(mocks.prismaAiSettingUpsert).toHaveBeenCalledWith({
      where: { id: 1 },
      update: {
        topicPromptLimit: 9,
        testQuestionCount: 6,
        maxUserPromptLength: 700,
      },
      create: {
        id: 1,
        topicPromptLimit: 9,
        testQuestionCount: 6,
        maxUserPromptLength: 700,
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/ai?saved=settings");
  });

  it("lets a parent reset AI usage for their own child topic", async () => {
    const formData = new FormData();
    formData.set("childId", "child_1");
    formData.set("topicId", "topic_1");
    mocks.prismaChildFindFirstOrThrow.mockResolvedValue({ id: "child_1" });
    mocks.resetAiUsage.mockResolvedValue(undefined);

    await resetAiUsageAction(formData);

    expect(mocks.prismaChildFindFirstOrThrow).toHaveBeenCalledWith({
      where: {
        id: "child_1",
        userId: "parent_1",
        subjects: {
          some: {
            chapters: {
              some: {
                topics: {
                  some: {
                    id: "topic_1",
                  },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    expect(mocks.resetAiUsage).toHaveBeenCalledWith("child_1", "topic_1");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/ai?reset=1");
  });

  it("redirects submitted tests to a fresh URL", async () => {
    const formData = new FormData();
    formData.set("attemptId", "attempt_1");
    formData.set("sessionId", "session_1");
    formData.set("requestId", "request_1");
    mocks.submitTopicTest.mockResolvedValue(undefined);
    mocks.getAiSession.mockResolvedValue({ topicId: "topic_1", id: "session_1" });

    await submitTopicTestAction(formData);

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/ai/test/topic_1/session_1");
    expect(mocks.redirect).toHaveBeenCalledWith("/ai/test/topic_1/session_1?submitted=1");
  });
});
