"use client";

import { useMemo } from "react";
import { Issue } from "@/lib/types";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid, Legend } from "recharts";

export function AnalyticsChart({ issues }: { issues: Issue[] }) {
  const data = useMemo(() => {
    // Generate last 7 days including today
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        key: d.toISOString().split("T")[0],
        display: d.toLocaleDateString("en-US", { weekday: 'short' }),
        submitted: 0,
        resolved: 0,
      };
    });

    issues.forEach(issue => {
      const createdDateStr = new Date(issue.created_at).toISOString().split("T")[0];
      const d = days.find(x => x.key === createdDateStr);
      if (d) d.submitted++;
      
      if (issue.status === 'fixed') {
        const d_resolved = days.find(x => x.key === createdDateStr); 
        // In a true scenario we'd use 'resolved_at' if available, but for demo we just attribute resolution 
        // back to the day the issue was submitted or we can just say if it's fixed today, counting it today.
        // Assuming we count it towards submission day for simplicity to show 'submitted vs resolved':
        if (d_resolved) d_resolved.resolved++;
      }
    });

    return days;
  }, [issues]);

  if (!issues.length) return null;

  return (
    <div className="bg-card border border-border p-5 rounded-2xl shadow-sm w-full h-[250px] relative overflow-hidden flex flex-col">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">7-Day Resolution Activity</h2>
      <div className="flex-1 -ml-6 -mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey="display" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
            <Tooltip 
              cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
              contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }} 
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            <Bar dataKey="submitted" name="Submitted" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
