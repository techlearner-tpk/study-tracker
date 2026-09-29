import { AppShell } from "@/components/layout/app-shell";
import { TestPaperTakeView } from "@/features/test-papers/components";
import { getOwnedOnlineTestPaper, startOnlineTestAttempt } from "@/features/test-papers/service";
import { requireCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  OnlineTestPaperUnavailableError,
  onlineTestPaperUnavailableMessage,
} from "@/features/test-papers/availability";

export const dynamic = "force-dynamic";

export default async function TakeParentTestPaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const user = await requireCurrentUser();
  const { paperId } = await params;
  const paper = await getOwnedOnlineTestPaper(user.id, paperId);
  let attemptId: string;
  try {
    attemptId = await startOnlineTestAttempt(user.id, paperId);
  } catch (error) {
    if (error instanceof OnlineTestPaperUnavailableError) {
      redirect(`/test-papers/${paperId}?error=${encodeURIComponent(onlineTestPaperUnavailableMessage)}`);
    }
    throw error;
  }

  return (
    <AppShell>
      <TestPaperTakeView paper={paper} attemptId={attemptId} hrefBase="/test-papers" />
    </AppShell>
  );
}
