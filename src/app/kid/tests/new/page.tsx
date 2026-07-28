import { AppShell } from "@/components/layout/app-shell";
import { TestPaperCreateForm } from "@/features/test-papers/components";
import { loadTestPaperSelectionForKid } from "@/features/test-papers/service";
import { requireKidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewKidTestPage() {
  const user = await requireKidUser();
  if (!user.childId) throw new Error("Kid account is not linked to a child.");
  const data = await loadTestPaperSelectionForKid(user.id, user.childId);

  return (
    <AppShell>
      <TestPaperCreateForm data={data} kidMode />
    </AppShell>
  );
}
