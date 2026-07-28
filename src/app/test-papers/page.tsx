import { AppShell } from "@/components/layout/app-shell";
import { TestPaperList } from "@/features/test-papers/components";
import { loadOnlineTestPapersForParent } from "@/features/test-papers/service";
import { requireParentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TestPapersPage() {
  const user = await requireParentUser();
  const papers = await loadOnlineTestPapersForParent(user.id);

  return (
    <AppShell>
      <TestPaperList papers={papers} hrefBase="/test-papers" newHref="/test-papers/new" />
    </AppShell>
  );
}
