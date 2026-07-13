import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { AssignmentDetailView } from "@/features/assignments/components";
import { getOwnedAssignment } from "@/lib/ownership";
import { requireKidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KidAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const user = await requireKidUser();
  if (!user.childId) notFound();
  const { assignmentId } = await params;
  const assignment = await getOwnedAssignment(user.id, assignmentId);
  if (!assignment) notFound();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-800">Kid portal</p>
            <h1 className="text-3xl font-semibold tracking-tight">Assignment details</h1>
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

        <AssignmentDetailView assignment={assignment} hrefBase="/kid/assignments" />
      </div>
    </main>
  );
}
