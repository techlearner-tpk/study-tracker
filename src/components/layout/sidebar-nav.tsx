"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav({
  items,
  collapsed = false,
}: {
  items: Array<{
    href: string;
    label: string;
    icon: React.ReactNode;
  }>;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="mt-8 grid gap-1.5 text-sm">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center rounded-md px-3 py-2 transition",
              collapsed ? "justify-center" : "gap-2",
              active ? "bg-emerald-50 font-semibold text-emerald-800 shadow-sm" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800",
            )}
          >
            {item.icon}
            {!collapsed ? item.label : null}
          </Link>
        );
      })}
    </nav>
  );
}
