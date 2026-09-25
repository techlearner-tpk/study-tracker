import { AppShell } from "@/components/layout/app-shell";
import { TestPaperCreateForm } from "@/features/test-papers/components";
import { loadTestPaperSelectionForParent } from "@/features/test-papers/service";
import { requireParentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewTestPaperPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const user = await requireParentUser();
  const query = await searchParams;
  const data = await loadTestPaperSelectionForParent(user.id);

  return (
    <AppShell currentUser={user}>
      <TestPaperCreateForm data={data} error={query?.error} />
    </AppShell>
  );
}
