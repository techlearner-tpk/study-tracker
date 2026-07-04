import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "KID" ? "/kid" : "/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10 text-stone-900">
      <Card className="w-full max-w-xl">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-emerald-800">Study Tracker</p>
            <CardTitle className="mt-2 text-3xl">Sign in with Clerk</CardTitle>
            <p className="mt-2 text-sm text-stone-600">
              Parents sign up with email, kids are onboarded by a parent, and Clerk handles verification before access opens.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/sign-in" className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-medium text-white transition hover:bg-emerald-900">
              <ArrowRight size={16} />
              Sign in
            </Link>
            <Link href="/sign-up" className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 transition hover:bg-stone-100">
              <Mail size={16} />
              Sign up
            </Link>
          </div>

          <p className="text-xs text-stone-500">
            The parent account is the first stop. After a child is added, they can create their Clerk account using the same email address and the app will
            attach the record automatically.
          </p>
        </div>
      </Card>
    </main>
  );
}
