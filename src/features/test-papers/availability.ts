import { OnlineTestPaperStatus } from "@prisma/client";

export const onlineTestPaperUnavailableMessage =
  "This paper is not available for taking. It may already be completed or may not have generated successfully.";

export class OnlineTestPaperUnavailableError extends Error {
  constructor() {
    super(onlineTestPaperUnavailableMessage);
    this.name = "OnlineTestPaperUnavailableError";
  }
}

export function canTakeOnlineTestPaper(status: OnlineTestPaperStatus) {
  return status === OnlineTestPaperStatus.ASSIGNED || status === OnlineTestPaperStatus.IN_PROGRESS;
}
