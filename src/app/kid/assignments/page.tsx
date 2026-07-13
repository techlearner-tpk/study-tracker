import Link from "next/link";
import { Plus } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
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
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-800">Kid portal</p>
            <h1 className="text-3xl font-semibold tracking-tight">My assignments</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/kid">
              <Button type="button" variant="secondary">
                Back
              </Button>
            </Link>
            <UserButton />
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
    </main>
  );
}
