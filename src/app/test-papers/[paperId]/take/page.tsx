import { AppShell } from "@/components/layout/app-shell";
import { TestPaperTakeView } from "@/features/test-papers/components";
import { getOwnedOnlineTestPaper, startOnlineTestAttempt } from "@/features/test-papers/service";
import { requireCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TakeParentTestPaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const user = await requireCurrentUser();
  const { paperId } = await params;
  const paper = await getOwnedOnlineTestPaper(user.id, paperId);
  const attemptId = await startOnlineTestAttempt(user.id, paperId);

  return (
    <AppShell>
      <TestPaperTakeView paper={paper} attemptId={attemptId} hrefBase="/test-papers" />
    </AppShell>
  );
}
