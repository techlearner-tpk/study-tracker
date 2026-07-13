import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { TopicForm } from "@/features/topics/components";
import { AssignmentComposer } from "@/features/assignments/composer";
import { getAssignmentSelection, serializeAssignmentSelection } from "@/features/assignments/selection";
import { loadAssignmentSelectionChildForKid } from "@/features/assignments/service";
import { requireKidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KidAssignmentNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireKidUser();
  if (!user.childId) {
    return null;
  }

  const params = await searchParams;
  const child = await loadAssignmentSelectionChildForKid(user.id, user.childId);
  const children = child ? [child] : [];
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      query.set(key, value);
    }
  }
  const selection = getAssignmentSelection(children, query, user.childId);
  const returnTo = serializeAssignmentSelection("/kid/assignments/new", {
    childId: selection.childId,
    subjectId: selection.subjectId,
    chapterId: selection.chapterId,
    type: selection.type,
    priority: selection.priority,
  });

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-800">Kid portal</p>
            <h1 className="text-3xl font-semibold tracking-tight">Self-assign</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/kid/assignments">
              <Button type="button" variant="secondary">
                <ArrowLeft size={16} />
                Back
              </Button>
            </Link>
            <UserButton />
          </div>
        </header>

        {children.length ? (
          <>
            <AssignmentComposer mode="kid" tree={children} fixedChildId={user.childId} />

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
                <CardTitle>Select a subject and chapter first</CardTitle>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardTitle>No linked child found</CardTitle>
          </Card>
        )}
      </div>
    </main>
  );
}
