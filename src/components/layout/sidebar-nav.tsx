"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav({
  items,
}: {
  items: Array<{
    href: string;
    label: string;
    icon: React.ReactNode;
  }>;
}) {
  const pathname = usePathname();

  return (
    <nav className="mt-8 grid gap-2 text-sm">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 transition",
              active ? "bg-emerald-50 font-medium text-emerald-900" : "text-stone-700 hover:bg-stone-100",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
