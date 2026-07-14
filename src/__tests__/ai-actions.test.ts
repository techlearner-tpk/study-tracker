import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  requireParentUser: vi.fn(),
  prismaSubscriptionUpsert: vi.fn(),
  prismaAiSettingUpsert: vi.fn(),
  submitTopicTest: vi.fn(),
  getAiSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth", () => ({
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
  },
}));

vi.mock("@/features/ai/service", () => ({
  submitTopicTest: mocks.submitTopicTest,
  getAiSession: mocks.getAiSession,
}));

import { activateFamilySubscriptionAction, saveAiSettingsAction, submitTopicTestAction } from "@/features/ai/actions";

describe("ai actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireParentUser.mockResolvedValue({ id: "parent_1" });
  });

  it("activates the family subscription for the parent", async () => {
    await activateFamilySubscriptionAction();

    expect(mocks.prismaSubscriptionUpsert).toHaveBeenCalledWith({
      where: { parentId: "parent_1" },
      update: expect.objectContaining({ status: "ACTIVE" }),
      create: expect.objectContaining({ parentId: "parent_1", status: "ACTIVE" }),
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/ai");
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
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/ai");
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
