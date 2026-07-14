import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AiLearningPanel } from "@/features/ai/components";
import { getAssignmentAiAccessState } from "@/features/ai/service";
import { AssignmentDetailView } from "@/features/assignments/components";
import { getOwnedAssignment } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const user = await requireParentUser();
  const { assignmentId } = await params;
  const assignment = await getOwnedAssignment(user.id, assignmentId);
  const access = await getAssignmentAiAccessState(user.id, assignmentId);
  if (!assignment) notFound();

  return (
    <AppShell>
      <div className="grid gap-6">
        <AiLearningPanel
          access={access}
          topicId={assignment.topicId}
          topicName={assignment.topic.name}
          assignmentId={assignment.id}
          assignmentType={assignment.type}
          historyHref={`/topics/${assignment.topicId}/ai-history`}
          isAdmin
        />
        <AssignmentDetailView assignment={assignment} hrefBase="/assignments" />
      </div>
    </AppShell>
  );
}
