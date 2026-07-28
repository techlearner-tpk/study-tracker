import { AppShell } from "@/components/layout/app-shell";
import { TestPaperDetail } from "@/features/test-papers/components";
import { getOwnedOnlineTestPaper } from "@/features/test-papers/service";
import { requireKidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KidTestDetailPage({ params }: { params: Promise<{ paperId: string }> }) {
  const user = await requireKidUser();
  const { paperId } = await params;
  const paper = await getOwnedOnlineTestPaper(user.id, paperId);

  return (
    <AppShell>
      <TestPaperDetail paper={paper} hrefBase="/kid/tests" canTake />
    </AppShell>
  );
}
