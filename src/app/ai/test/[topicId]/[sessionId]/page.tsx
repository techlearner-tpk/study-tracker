import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AiTestSessionView } from "@/features/ai/components";
import { getAiSession, getTopicAiAccessState } from "@/features/ai/service";
import { requireCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AiTestSessionPage({
  params,
}: {
  params: Promise<{ topicId: string; sessionId: string }>;
}) {
  const user = await requireCurrentUser();
  const { topicId, sessionId } = await params;
  const access = await getTopicAiAccessState(user.id, topicId);
  const session = await getAiSession(sessionId);

  if (!session || session.topicId !== topicId || access.topic.id !== topicId) {
    notFound();
  }

  const backHref = user.role === "KID" ? `/kid/topics/${topicId}` : `/topics/${topicId}`;
  const content = <AiTestSessionView session={session} backHref={backHref} isAdmin={user.role === "PARENT"} />;

  if (user.role === "PARENT") {
    return <AppShell>{content}</AppShell>;
  }

  return <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6 lg:px-8">{content}</main>;
}
