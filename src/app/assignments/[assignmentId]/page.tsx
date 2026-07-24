import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AiLearningPanel } from "@/features/ai/components";
import { getAssignmentAiAccessState } from "@/features/ai/service";
import { AssignmentDetailView } from "@/features/assignments/components";
import { getOwnedAssignment } from "@/lib/ownership";
import { isAdminUser, requireParentUser } from "@/lib/auth";
import { Notice } from "@/components/ui/notice";

export const dynamic = "force-dynamic";

export default async function AssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams?: Promise<{ studyStatus?: string; practiceStatus?: string; revisionStatus?: string }>;
}) {
  const user = await requireParentUser();
  const { assignmentId } = await params;
  const query = await searchParams;
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
          isAdmin={isAdminUser(user)}
        />
        {query?.studyStatus ? <Notice tone="success">Study session logged.</Notice> : null}
        {query?.practiceStatus ? <Notice tone="success">Practice session logged.</Notice> : null}
        {query?.revisionStatus ? <Notice tone="success">Revision session logged.</Notice> : null}
        <AssignmentDetailView assignment={assignment} hrefBase="/assignments" />
      </div>
    </AppShell>
  );
}
