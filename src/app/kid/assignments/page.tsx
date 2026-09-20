import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AssignmentGroupSection } from "@/features/assignments/components";
import { groupAssignments, loadAssignmentsForKid } from "@/features/assignments/service";
import { requireKidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KidAssignmentsPage() {
  const user = await requireKidUser();
  if (!user.childId) {
    return null;
  }
  const assignments = await loadAssignmentsForKid(user.childId);
  const groups = groupAssignments(assignments);

  return (
    <AppShell>
      <div className="grid gap-6">
        <header>
          <div>
            <p className="text-sm font-medium text-emerald-800">Kid portal</p>
            <h1 className="text-3xl font-semibold tracking-tight">My assignments</h1>
          </div>
        </header>

        <Card>
          <CardTitle>Current focus</CardTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{assignments.length} assignments</Badge>
            <Badge>{groups.find((group) => group.key === "overdue")?.items.length ?? 0} overdue</Badge>
          </div>
        </Card>

        <div className="grid gap-6">
          {assignments.length ? (
            groups.map((group) => <AssignmentGroupSection key={group.key} group={group} hrefBase="/kid/assignments" />)
          ) : (
            <Card>
              <CardTitle>No assignments yet</CardTitle>
              <p className="mt-2 text-sm text-stone-600">Ask a parent for a new assignment or add one for yourself.</p>
              <div className="mt-4">
                <Link href="/kid/assignments/new">
                  <Button type="button">
                    <Plus size={16} />
                    Self-assign
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
