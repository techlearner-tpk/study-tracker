"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpenCheck, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";

const sidebarStorageKey = "study-tracker.sidebar-collapsed";

type SidebarItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type SidebarChild = {
  id: string;
  name: string;
};

export function AppShellFrame({
  children,
  items,
  childrenList,
}: {
  children: React.ReactNode;
  items: SidebarItem[];
  childrenList: SidebarChild[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(sidebarStorageKey);
    setCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(sidebarStorageKey, String(collapsed));
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-[#fbfdfb] text-slate-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden border-r border-slate-200/80 bg-white/95 px-4 py-4 shadow-[8px_0_30px_rgba(15,23,42,0.03)] backdrop-blur transition-[width,padding] duration-200 lg:block",
          collapsed ? "w-24" : "w-72",
        )}
      >
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "justify-between")}>
          <Link href="/" className="flex min-w-0 items-center gap-3 text-lg font-semibold tracking-tight text-slate-950" title="Study Tracker">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <BookOpenCheck size={21} />
            </span>
            {!collapsed ? "Study Tracker" : null}
          </Link>
          {!collapsed ? <UserButton /> : null}
        </div>

        <div className={cn("mt-4 flex items-center", collapsed ? "justify-center" : "justify-between gap-3")}>
          {collapsed ? <UserButton /> : <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Navigation</p>}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCollapsed((value) => !value)}
            className={cn("h-9 w-9 p-0", collapsed ? "" : "text-slate-500")}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
        </div>

        <SidebarNav items={items} collapsed={collapsed} />

        <div className="mt-5">
          {!collapsed ? <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Children</p> : null}
          <div className={cn("mt-2 grid gap-2", collapsed ? "justify-items-center" : "")}>
            {childrenList.map((child) => (
              <Link
                key={child.id}
                href={`/children/${child.id}`}
                title={child.name}
                className={cn(
                  "rounded-md text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800",
                  collapsed
                    ? "flex h-10 w-10 items-center justify-center bg-emerald-50 font-semibold uppercase text-emerald-800"
                    : "px-3 py-2",
                )}
              >
                {collapsed ? child.name.slice(0, 1) : child.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <main className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-24" : "lg:pl-72")}>
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
