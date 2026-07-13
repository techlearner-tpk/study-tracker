import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireParentUser: vi.fn(),
  prismaSubscriptionUpsert: vi.fn(),
  prismaAiSettingUpsert: vi.fn(),
}));

vi.mock("server-only", () => ({}));

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

import { activateFamilySubscriptionAction, saveAiSettingsAction } from "@/features/ai/actions";

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
});
