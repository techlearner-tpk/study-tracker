import { Bot, BookOpen, CalendarDays, ClipboardList, FileQuestion, Home, LineChart } from "lucide-react";
import { getChildren } from "@/features/dashboard/queries";
import { isAdminUser, requireCurrentUser } from "@/lib/auth";
import { AppShellFrame } from "./app-shell-frame";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  const childrenList = await getChildren(user.id);
  const admin = isAdminUser(user);

  return (
    <AppShellFrame
      userName={user.name}
      items={[
        { href: "/", label: "Overview", icon: <Home size={17} /> },
        { href: user.role === "KID" ? "/kid/assignments" : "/assignments", label: "Assignments", icon: <ClipboardList size={17} /> },
        { href: user.role === "KID" ? "/kid/tests" : "/test-papers", label: "Test Papers", icon: <FileQuestion size={17} /> },
        { href: "/admin/ai", label: "AI Tutor", icon: <Bot size={17} /> },
        { href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} /> },
        { href: "/reports", label: "Reports", icon: <LineChart size={17} /> },
        ...(admin ? [
          { href: "/admin/curriculum", label: "Curriculum", icon: <BookOpen size={17} /> },
          { href: "/admin/test-templates", label: "Test Templates", icon: <FileQuestion size={17} /> },
        ] : []),
      ]}
      childrenList={childrenList.map((child) => ({ id: child.id, name: child.name }))}
    >
      {children}
    </AppShellFrame>
  );
}
