import { AppShell } from "@/components/layout/app-shell";
import { TestPaperCreateForm } from "@/features/test-papers/components";
import { loadTestPaperSelectionForParent } from "@/features/test-papers/service";
import { requireParentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewTestPaperPage() {
  const user = await requireParentUser();
  const data = await loadTestPaperSelectionForParent(user.id);

  return (
    <AppShell>
      <TestPaperCreateForm data={data} />
    </AppShell>
  );
}
