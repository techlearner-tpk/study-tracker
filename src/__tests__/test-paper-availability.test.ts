import { describe, expect, it } from "vitest";
import { OnlineTestPaperStatus } from "@prisma/client";
import { canTakeOnlineTestPaper } from "@/features/test-papers/availability";

describe("online test paper availability", () => {
  it.each([
    OnlineTestPaperStatus.ASSIGNED,
    OnlineTestPaperStatus.IN_PROGRESS,
  ])("allows %s papers to be taken", (status) => {
    expect(canTakeOnlineTestPaper(status)).toBe(true);
  });

  it.each([
    OnlineTestPaperStatus.GENERATING,
    OnlineTestPaperStatus.REVIEWING,
    OnlineTestPaperStatus.DRAFT,
    OnlineTestPaperStatus.SUBMITTED,
    OnlineTestPaperStatus.EVALUATED,
    OnlineTestPaperStatus.ARCHIVED,
    OnlineTestPaperStatus.FAILED,
  ])("does not offer the test player for %s papers", (status) => {
    expect(canTakeOnlineTestPaper(status)).toBe(false);
  });
});
