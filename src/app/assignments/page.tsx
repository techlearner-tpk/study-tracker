import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AssignmentGroupSection } from "@/features/assignments/components";
import { groupAssignments, loadAssignmentsForParent } from "@/features/assignments/service";
import { requireParentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const user = await requireParentUser();
  const assignments = await loadAssignmentsForParent(user.id);
  const groups = groupAssignments(assignments);

  return (
    <AppShell>
      <div className="grid gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-800">Assignments</p>
            <h1 className="text-3xl font-semibold tracking-tight">Assignments</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              Assignments are saved study plans linked to one topic. They can be parent-made or self-made, while AI help stays inside the linked topic.
            </p>
          </div>
          <Link href="/assignments/new">
            <Button type="button">
              <Plus size={16} />
              New assignment
            </Button>
          </Link>
        </header>

        {assignments.length ? (
          <div className="grid gap-6">
            {groups.map((group) => (
              <AssignmentGroupSection key={group.key} group={group} hrefBase="/assignments" />
            ))}
          </div>
        ) : (
          <Card>
            <CardTitle>No assignments yet</CardTitle>
            <p className="mt-2 text-sm text-stone-600">Create the first assignment and keep it tied to a topic, sessions, and progress.</p>
            <div className="mt-4">
              <Link href="/assignments/new">
                <Button type="button">
                  <Plus size={16} />
                  New assignment
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
