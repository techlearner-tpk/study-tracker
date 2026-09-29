import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  requireCurrentUser: vi.fn(),
  startOnlineTestAttempt: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth", () => ({
  requireAdminUser: vi.fn(),
  requireCurrentUser: mocks.requireCurrentUser,
  requireParentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/features/test-papers/service", () => ({
  startOnlineTestAttempt: mocks.startOnlineTestAttempt,
}));

import { startOnlineTestAttemptAction } from "@/features/test-papers/actions";
import {
  OnlineTestPaperUnavailableError,
  onlineTestPaperUnavailableMessage,
} from "@/features/test-papers/availability";

describe("online test paper actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.startOnlineTestAttempt.mockRejectedValue(new OnlineTestPaperUnavailableError());
  });

  it.each([
    ["PARENT", "/test-papers/paper_1"],
    ["KID", "/kid/tests/paper_1"],
  ])("redirects an unavailable %s paper to its detail page", async (role, detailPath) => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "user_1", role });
    const formData = new FormData();
    formData.set("paperId", "paper_1");

    await expect(startOnlineTestAttemptAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      `${detailPath}?error=${encodeURIComponent(onlineTestPaperUnavailableMessage)}`,
    );
  });
});
