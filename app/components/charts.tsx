'use client';

import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usd } from '@/lib/format';

export interface TeamSpendDatum {
  name: string;
  recoverable: number;
  remaining: number;
}

export interface LeakDatum {
  name: string;
  value: number;
  color: string;
}

const axisStyle = { fontSize: 12, fill: 'currentColor' };

function compactUsd(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}

export function TeamSpendChart({ data }: { data: TeamSpendDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <XAxis dataKey="name" tickLine={false} axisLine={false} style={axisStyle} />
        <YAxis tickFormatter={compactUsd} tickLine={false} axisLine={false} width={48} style={axisStyle} />
        <Tooltip
          cursor={{ fill: 'rgba(120,120,120,0.08)' }}
          formatter={(value, name) => [usd(Number(value)), name === 'recoverable' ? 'Recoverable' : 'Remaining']}
          contentStyle={{ borderRadius: 8, border: '1px solid rgba(120,120,120,0.25)', fontSize: 13 }}
        />
        <Bar dataKey="remaining" stackId="spend" fill="#94a3b8" radius={[0, 0, 0, 0]} />
        <Bar dataKey="recoverable" stackId="spend" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface TrendDatum {
  day: number;
  budget: number;
  actual: number | null;
  projected: number | null;
  optimized: number | null;
}

export function SpendTrendChart({ data }: { data: TrendDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          style={axisStyle}
          tickFormatter={(d) => `D${d}`}
        />
        <YAxis tickFormatter={compactUsd} tickLine={false} axisLine={false} width={48} style={axisStyle} />
        <Tooltip
          formatter={(value, name) => [usd(Number(value)), String(name)]}
          labelFormatter={(d) => `Day ${d}`}
          contentStyle={{ borderRadius: 8, border: '1px solid rgba(120,120,120,0.25)', fontSize: 13 }}
        />
        <Line type="monotone" dataKey="budget" name="Budget" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="projected" name="If nothing changes" stroke="#ef4444" strokeDasharray="2 3" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="optimized" name="With tokenTriage" stroke="#10b981" strokeDasharray="5 4" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="actual" name="Actual" stroke="#059669" dot={false} strokeWidth={2.5} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface BeforeAfterDatum {
  name: string;
  before: number;
  after: number;
}

export function BeforeAfterChart({ data }: { data: BeforeAfterDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <XAxis dataKey="name" tickLine={false} axisLine={false} style={axisStyle} />
        <YAxis tickFormatter={compactUsd} tickLine={false} axisLine={false} width={48} style={axisStyle} />
        <Tooltip
          cursor={{ fill: 'rgba(120,120,120,0.08)' }}
          formatter={(value, name) => [usd(Number(value)), name === 'before' ? 'Before' : 'After']}
          contentStyle={{ borderRadius: 8, border: '1px solid rgba(120,120,120,0.25)', fontSize: 13 }}
        />
        <Bar dataKey="before" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="after" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeakDonut({ data }: { data: LeakDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [usd(Number(value)), name]}
          contentStyle={{ borderRadius: 8, border: '1px solid rgba(120,120,120,0.25)', fontSize: 13 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
