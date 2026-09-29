import { AppShell } from "@/components/layout/app-shell";
import { TestPaperDetail } from "@/features/test-papers/components";
import { getOwnedOnlineTestPaper } from "@/features/test-papers/service";
import { requireKidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KidTestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ paperId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireKidUser();
  const { paperId } = await params;
  const { error } = await searchParams;
  const paper = await getOwnedOnlineTestPaper(user.id, paperId);

  return (
    <AppShell>
      <TestPaperDetail paper={paper} canTake error={error} />
    </AppShell>
  );
}
