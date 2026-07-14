import { AiTopicHistoryView } from "@/features/ai/history";
import { getTopicAiHistory } from "@/features/ai/service";
import { requireKidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KidTopicAiHistoryPage({ params }: { params: Promise<{ topicId: string }> }) {
  const user = await requireKidUser();
  const { topicId } = await params;
  const history = await getTopicAiHistory(user.id, topicId);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <AiTopicHistoryView history={history} backHref={`/kid/topics/${topicId}`} />
      </div>
    </main>
  );
}
