import { AppShell } from "@/components/layout/app-shell";
import { AiTopicHistoryView } from "@/features/ai/history";
import { getTopicAiHistory } from "@/features/ai/service";
import { requireKidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KidTopicAiHistoryPage({ params }: { params: Promise<{ topicId: string }> }) {
  const user = await requireKidUser();
  const { topicId } = await params;
  const history = await getTopicAiHistory(user.id, topicId);

  return (
    <AppShell>
      <div className="grid gap-6">
        <AiTopicHistoryView history={history} backHref={`/kid/topics/${topicId}`} />
      </div>
    </AppShell>
  );
}
