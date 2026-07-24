import Link from "next/link";
import { BookOpen, Brain, CalendarDays, ClipboardList, LineChart, UsersRound } from "lucide-react";
import { getChildren } from "@/features/dashboard/queries";
import { isAdminUser, requireCurrentUser } from "@/lib/auth";
import { AppShellFrame } from "./app-shell-frame";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  const childrenList = await getChildren(user.id);
  const admin = isAdminUser(user);

  return (
    <AppShellFrame
      items={[
        { href: "/", label: "Children", icon: <UsersRound size={17} /> },
        { href: "/assignments", label: "Assignments", icon: <ClipboardList size={17} /> },
        ...(admin ? [{ href: "/admin/ai", label: "AI", icon: <Brain size={17} /> }] : []),
        { href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} /> },
        { href: "/reports", label: "Reports", icon: <LineChart size={17} /> },
        ...(admin ? [{ href: "/admin/curriculum", label: "Curriculum", icon: <BookOpen size={17} /> }] : []),
      ]}
      childrenList={childrenList.map((child) => ({ id: child.id, name: child.name }))}
    >
      {children}
    </AppShellFrame>
  );
}
