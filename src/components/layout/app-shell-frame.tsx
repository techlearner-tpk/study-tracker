"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden border-r border-stone-200 bg-white px-4 py-5 transition-[width,padding] duration-200 lg:block",
          collapsed ? "w-24" : "w-72",
        )}
      >
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "justify-between")}>
          <Link href="/" className="min-w-0 text-xl font-semibold tracking-tight text-emerald-950" title="Study Tracker">
            {collapsed ? "ST" : "Study Tracker"}
          </Link>
          {!collapsed ? <UserButton /> : null}
        </div>

        <div className={cn("mt-5 flex items-center", collapsed ? "justify-center" : "justify-between gap-3")}>
          {collapsed ? <UserButton /> : <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Navigation</p>}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCollapsed((value) => !value)}
            className={cn("h-9 w-9 p-0", collapsed ? "" : "text-stone-600")}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
        </div>

        <SidebarNav items={items} collapsed={collapsed} />

        <div className="mt-8">
          {!collapsed ? <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Children</p> : null}
          <div className={cn("mt-3 grid gap-2", collapsed ? "justify-items-center" : "")}>
            {childrenList.map((child) => (
              <Link
                key={child.id}
                href={`/children/${child.id}`}
                title={child.name}
                className={cn(
                  "rounded-md text-sm text-stone-700 hover:bg-stone-100",
                  collapsed
                    ? "flex h-10 w-10 items-center justify-center bg-stone-50 font-semibold uppercase"
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
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
