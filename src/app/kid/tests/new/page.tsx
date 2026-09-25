import { AppShell } from "@/components/layout/app-shell";
import { TestPaperCreateForm } from "@/features/test-papers/components";
import { loadTestPaperSelectionForKid } from "@/features/test-papers/service";
import { requireKidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewKidTestPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const user = await requireKidUser();
  const query = await searchParams;
  if (!user.childId) throw new Error("Kid account is not linked to a child.");
  const data = await loadTestPaperSelectionForKid(user.id, user.childId);

  return (
    <AppShell currentUser={user}>
      <TestPaperCreateForm data={data} error={query?.error} kidMode />
    </AppShell>
  );
}
