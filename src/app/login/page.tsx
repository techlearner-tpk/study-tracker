import { redirect } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/features/auth/components";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4">
      <Card className="w-full max-w-md">
        <CardTitle className="text-2xl">Study Tracker</CardTitle>
        <p className="mt-2 text-sm text-stone-600">Sign in with the parent account to manage children, goals, and learning progress.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </Card>
    </main>
  );
}
