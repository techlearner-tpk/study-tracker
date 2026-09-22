import { Bot, BookOpen, CalendarDays, ClipboardList, FileQuestion, Home, LineChart } from "lucide-react";
import { getChildren } from "@/features/dashboard/queries";
import { isAdminUser, requireCurrentUser, type CurrentUser } from "@/lib/auth";
import { AppShellFrame } from "./app-shell-frame";

export async function AppShell({ children, currentUser }: { children: React.ReactNode; currentUser?: CurrentUser }) {
  const user = currentUser ?? await requireCurrentUser();
  const kidMode = user.role === "KID";
  const childrenList = kidMode ? [] : await getChildren(user.id);
  const admin = isAdminUser(user);
  const items = kidMode
    ? [
        { href: "/kid", label: "Overview", icon: <Home size={17} /> },
        { href: "/kid/assignments", label: "Assignments", icon: <ClipboardList size={17} /> },
        { href: "/kid/tests", label: "Test Papers", icon: <FileQuestion size={17} /> },
      ]
    : [
        { href: "/", label: "Overview", icon: <Home size={17} /> },
        { href: "/assignments", label: "Assignments", icon: <ClipboardList size={17} /> },
        { href: "/test-papers", label: "Test Papers", icon: <FileQuestion size={17} /> },
        { href: "/admin/ai", label: "AI Tutor", icon: <Bot size={17} /> },
        { href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} /> },
        { href: "/reports", label: "Reports", icon: <LineChart size={17} /> },
        ...(admin ? [
          { href: "/admin/curriculum", label: "Curriculum", icon: <BookOpen size={17} /> },
          { href: "/admin/test-templates", label: "Test Templates", icon: <FileQuestion size={17} /> },
        ] : []),
      ];

  return (
    <AppShellFrame
      userName={user.name}
      homeHref={kidMode ? "/kid" : "/"}
      items={items}
      childrenList={childrenList.map((child) => ({ id: child.id, name: child.name }))}
    >
      {children}
    </AppShellFrame>
  );
}
