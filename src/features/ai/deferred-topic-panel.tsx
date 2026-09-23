import { Card } from "@/components/ui/card";
import { getOwnedTopic } from "@/lib/ownership";
import { AiLearningPanel } from "./components";
import { getTopicAiAccessState } from "./service";

type OwnedTopic = Awaited<ReturnType<typeof getOwnedTopic>>;

type DeferredTopicAiPanelProps = {
  userId: string;
  topic: OwnedTopic;
  historyHref: string;
  deleteError?: string | null;
  isAdmin?: boolean;
};

export async function DeferredTopicAiPanel({
  userId,
  topic,
  historyHref,
  deleteError,
  isAdmin = false,
}: DeferredTopicAiPanelProps) {
  const access = await getTopicAiAccessState(userId, topic.id, topic);

  return (
    <AiLearningPanel
      access={access}
      topicId={topic.id}
      topicName={topic.name}
      historyHref={historyHref}
      deleteError={deleteError}
      isAdmin={isAdmin}
    />
  );
}

export function TopicAiPanelFallback() {
  return (
    <Card aria-busy="true" aria-label="Loading AI learning" className="grid gap-4">
      <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="h-10 w-40 animate-pulse rounded bg-slate-100" />
      <span className="sr-only">Loading AI learning</span>
    </Card>
  );
}
