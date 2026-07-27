"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const overviewItems = items.filter((item) => item.href === "/");
  const manageItems = items.filter((item) => item.href.includes("curriculum"));
  const learningItems = items.filter((item) => item.href !== "/" && !item.href.includes("curriculum"));

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
          "fixed inset-y-0 left-0 hidden border-r border-slate-200/80 bg-white/95 px-4 py-5 shadow-[8px_0_30px_rgba(15,23,42,0.03)] backdrop-blur transition-[width,padding] duration-200 lg:block",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "justify-between")}>
            <Link href="/" className="flex min-w-0 items-center gap-3 text-lg font-semibold tracking-tight text-slate-950" title="Study Tracker">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <BookOpenCheck size={22} />
              </span>
              {!collapsed ? "Study Tracker" : null}
            </Link>
            {!collapsed ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCollapsed((value) => !value)}
                className="h-9 w-9 p-0 text-slate-500"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={18} />
              </Button>
            ) : null}
          </div>

          {collapsed ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCollapsed(false)}
              className="mx-auto mt-4 h-9 w-9 p-0 text-slate-500"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={18} />
            </Button>
          ) : null}

          <div className="mt-7 grid gap-6">
            <SidebarNav items={overviewItems} collapsed={collapsed} />

            <SidebarSection collapsed={collapsed} title="Learning">
              <SidebarNav items={learningItems} collapsed={collapsed} />
            </SidebarSection>

            {manageItems.length ? (
              <SidebarSection collapsed={collapsed} title="Manage">
                <SidebarNav items={manageItems} collapsed={collapsed} />
              </SidebarSection>
            ) : null}

            <SidebarSection collapsed={collapsed} title="Children">
              <div className={cn("grid gap-2", collapsed ? "justify-items-center" : "")}>
                {childrenList.map((child, index) => {
                  const href = `/children/${child.id}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  const color = index % 2 === 0 ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-700";
                  return (
                    <Link
                      key={child.id}
                      href={href}
                      title={child.name}
                      className={cn(
                        "relative flex items-center rounded-md text-sm transition hover:bg-emerald-50 hover:text-emerald-800",
                        collapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-2.5",
                        active && !collapsed ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-700",
                      )}
                    >
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase", color)}>
                        {child.name.slice(0, 1)}
                      </span>
                      {!collapsed ? <span className="min-w-0 truncate">{child.name}</span> : null}
                      {active && !collapsed ? <span className="absolute right-0 top-2 h-8 w-1 rounded-l-full bg-emerald-600" /> : null}
                    </Link>
                  );
                })}
              </div>
            </SidebarSection>
          </div>

          <div className={cn("mt-auto border-t border-slate-100 pt-4", collapsed ? "flex justify-center" : "")}>
            {collapsed ? (
              <UserButton />
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <UserButton />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-950">Parent</p>
                    <p className="text-xs text-slate-500">View profile</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 lg:px-10">{children}</div>
      </main>
    </div>
  );
}

function SidebarSection({
  children,
  collapsed,
  title,
}: {
  children: React.ReactNode;
  collapsed: boolean;
  title: string;
}) {
  return (
    <div>
      {!collapsed ? <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p> : null}
      {children}
    </div>
  );
}
