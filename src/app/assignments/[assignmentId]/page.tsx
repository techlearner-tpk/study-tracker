import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AssignmentDetailView } from "@/features/assignments/components";
import { getOwnedAssignment } from "@/lib/ownership";
import { requireParentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const user = await requireParentUser();
  const { assignmentId } = await params;
  const assignment = await getOwnedAssignment(user.id, assignmentId);
  if (!assignment) notFound();

  return (
    <AppShell>
      <AssignmentDetailView assignment={assignment} hrefBase="/assignments" />
    </AppShell>
  );
}
