"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ReportsChart({ draws }: { draws: any[] }) {
  const data = draws
    .slice()
    .sort((a, b) => a.period_year - b.period_year || a.period_month - b.period_month)
    .map((d) => ({
      label: `${d.period_month}/${String(d.period_year).slice(2)}`,
      pool: Math.round(d.total_pool_cents / 100),
    }));

  if (data.length === 0) return <p className="text-mute text-sm">No draws recorded yet.</p>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#212A35" />
          <XAxis dataKey="label" stroke="#8FA0B3" fontSize={12} />
          <YAxis stroke="#8FA0B3" fontSize={12} />
          <Tooltip contentStyle={{ background: "#121821", border: "1px solid #212A35" }} />
          <Bar dataKey="pool" fill="#3ECF8E" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
