"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function WeeklyActivityChart({ data }: { data: { name: string; study: number; practice: number; revision: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="study" fill="#047857" radius={[4, 4, 0, 0]} />
          <Bar dataKey="practice" fill="#5b6f95" radius={[4, 4, 0, 0]} />
          <Bar dataKey="revision" fill="#a16207" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

