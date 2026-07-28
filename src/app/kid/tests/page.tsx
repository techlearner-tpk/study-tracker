import { AppShell } from "@/components/layout/app-shell";
import { TestPaperList } from "@/features/test-papers/components";
import { loadOnlineTestPapersForKid } from "@/features/test-papers/service";
import { requireKidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KidTestsPage() {
  const user = await requireKidUser();
  if (!user.childId) throw new Error("Kid account is not linked to a child.");
  const papers = await loadOnlineTestPapersForKid(user.childId);

  return (
    <AppShell>
      <TestPaperList papers={papers} hrefBase="/kid/tests" newHref="/kid/tests/new" />
    </AppShell>
  );
}
