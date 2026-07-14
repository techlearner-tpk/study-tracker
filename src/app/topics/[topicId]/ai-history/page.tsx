import { AppShell } from "@/components/layout/app-shell";
import { AiTopicHistoryView } from "@/features/ai/history";
import { getTopicAiHistory } from "@/features/ai/service";
import { requireCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TopicAiHistoryPage({ params }: { params: Promise<{ topicId: string }> }) {
  const user = await requireCurrentUser();
  const { topicId } = await params;
  const history = await getTopicAiHistory(user.id, topicId);

  return (
    <AppShell>
      <AiTopicHistoryView history={history} backHref={`/topics/${topicId}`} />
    </AppShell>
  );
}
