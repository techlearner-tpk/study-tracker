import Link from "next/link";
import { BookOpen, Brain, CalendarDays, ClipboardList, LineChart, UsersRound } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { getChildren } from "@/features/dashboard/queries";
import { isAdminUser, requireCurrentUser } from "@/lib/auth";
import { SidebarNav } from "./sidebar-nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  const childrenList = await getChildren(user.id);
  const admin = isAdminUser(user);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-white px-5 py-6 lg:block">
        <Link href="/" className="block text-xl font-semibold tracking-tight text-emerald-950">
          Study Tracker
        </Link>
        <div className="mt-4 rounded-md bg-stone-50 p-3 text-sm text-stone-600">
          <div className="flex items-start gap-3">
            <UserButton />
            <div className="min-w-0">
              <p className="truncate font-medium text-stone-900">{user.name}</p>
              <p className="truncate">{user.email}</p>
            </div>
          </div>
        </div>
        <SidebarNav
          items={[
            { href: "/", label: "Children", icon: <UsersRound size={17} /> },
            { href: "/assignments", label: "Assignments", icon: <ClipboardList size={17} /> },
            ...(admin ? [{ href: "/admin/ai", label: "AI", icon: <Brain size={17} /> }] : []),
            { href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} /> },
            { href: "/reports", label: "Reports", icon: <LineChart size={17} /> },
            ...(admin ? [{ href: "/admin/curriculum", label: "Curriculum", icon: <BookOpen size={17} /> }] : []),
          ]}
        />
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Children</p>
          <div className="mt-3 grid gap-2">
            {childrenList.map((child) => (
              <Link key={child.id} href={`/children/${child.id}`} className="rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-stone-100">
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
