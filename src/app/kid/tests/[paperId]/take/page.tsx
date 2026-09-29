import { AppShell } from "@/components/layout/app-shell";
import { TestPaperTakeView } from "@/features/test-papers/components";
import { getOwnedOnlineTestPaper, startOnlineTestAttempt } from "@/features/test-papers/service";
import { requireKidUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  OnlineTestPaperUnavailableError,
  onlineTestPaperUnavailableMessage,
} from "@/features/test-papers/availability";

export const dynamic = "force-dynamic";

export default async function TakeKidTestPage({ params }: { params: Promise<{ paperId: string }> }) {
  const user = await requireKidUser();
  const { paperId } = await params;
  const paper = await getOwnedOnlineTestPaper(user.id, paperId);
  let attemptId: string;
  try {
    attemptId = await startOnlineTestAttempt(user.id, paperId);
  } catch (error) {
    if (error instanceof OnlineTestPaperUnavailableError) {
      redirect(`/kid/tests/${paperId}?error=${encodeURIComponent(onlineTestPaperUnavailableMessage)}`);
    }
    throw error;
  }

  return (
    <AppShell>
      <TestPaperTakeView paper={paper} attemptId={attemptId} hrefBase="/kid/tests" />
    </AppShell>
  );
}
