import { AppShell } from "@/components/layout/app-shell";
import { TestPaperDetail } from "@/features/test-papers/components";
import { getOwnedOnlineTestPaper } from "@/features/test-papers/service";
import { requireParentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TestPaperDetailPage({ params }: { params: Promise<{ paperId: string }> }) {
  const user = await requireParentUser();
  const { paperId } = await params;
  const paper = await getOwnedOnlineTestPaper(user.id, paperId);

  return (
    <AppShell>
      <TestPaperDetail paper={paper} hrefBase="/test-papers" canTake parentMode />
    </AppShell>
  );
}
