import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { TopicForm } from "@/features/topics/components";
import { AssignmentComposer } from "@/features/assignments/composer";
import { getAssignmentSelection, serializeAssignmentSelection } from "@/features/assignments/selection";
import { loadAssignmentSelectionChildrenForParent } from "@/features/assignments/service";
import { requireParentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AssignmentNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireParentUser();
  const params = await searchParams;
  const children = await loadAssignmentSelectionChildrenForParent(user.id);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      query.set(key, value);
    }
  }
  const selection = getAssignmentSelection(children, query);
  const returnTo = serializeAssignmentSelection("/assignments/new", {
    childId: selection.childId,
    subjectId: selection.subjectId,
    chapterId: selection.chapterId,
    type: selection.type,
    priority: selection.priority,
  });

  return (
    <AppShell>
      <div className="grid gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-800">Assignments</p>
            <h1 className="text-3xl font-semibold tracking-tight">Create assignment</h1>
          </div>
          <Link href="/assignments">
            <Button type="button" variant="secondary">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
        </header>

        {children.length ? (
          <>
            <AssignmentComposer mode="parent" tree={children} />

            {selection.chapterId ? (
              <Card>
                <CardTitle>Add topic first if needed</CardTitle>
                <p className="mt-2 text-sm text-stone-600">
                  If this chapter needs another topic, create it here and we will bring you back to the assignment form with it selected.
                </p>
                <div className="mt-4">
                  <TopicForm chapterId={selection.chapterId} returnTo={returnTo} />
                </div>
              </Card>
            ) : (
              <Card>
                <CardTitle>Select a child, subject, and chapter first</CardTitle>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardTitle>Add a child first</CardTitle>
            <p className="mt-2 text-sm text-stone-600">Assignments are tied to an existing child, so start by creating one from the home page.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
