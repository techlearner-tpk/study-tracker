"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DynamicGreeting({ name }: { name: string }) {
  const firstName = name.trim().split(/\s+/)[0] || name;
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <p className="flex items-center gap-2 text-xl font-semibold text-slate-950">
      {greeting}, {firstName}
      <Sparkles size={20} className="text-amber-500" />
    </p>
  );
}
