"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, ChartTooltip, type ChartSeries } from "./ChartCard";
import { formatCurrency, formatPercent } from "@/lib/format";

/** Recessive axis/grid styling shared by every chart. */
const AXIS = {
  stroke: "var(--line)",
  tick: { fill: "var(--fg-subtle)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

const GRID = {
  stroke: "var(--line)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export function AttendanceTrendChart({
  data,
}: {
  data: { date: string; percent: number }[];
}) {
  // A single series needs no legend — the title already names it.
  const series: ChartSeries[] = [
    {
      key: "percent",
      label: "Attendance",
      color: "--chart-1",
      format: (value) => formatPercent(value, 1),
    },
  ];

  const rows = data.map((point) => ({ date: point.date, percent: point.percent }));

  return (
    <ChartCard
      title="Attendance trend"
      description="Share of marked students present or late, by day."
      series={series}
      rows={rows}
      labelKey="date"
      labelHeader="Date"
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid {...GRID} />
            <XAxis
              dataKey="date"
              {...AXIS}
              // Only the day-of-month; the full ISO date makes an unreadable
              // axis at this width and the range is obvious from context.
              tickFormatter={(value: string) => value.slice(8)}
              minTickGap={16}
            />
            <YAxis
              {...AXIS}
              domain={[0, 100]}
              width={44}
              tickFormatter={(value: number) => `${value}%`}
            />
            <Tooltip
              content={<ChartTooltip series={series} />}
              cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="percent"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-raised)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function CollectionChart({
  data,
}: {
  data: { month: string; billed: number; collected: number }[];
}) {
  const series: ChartSeries[] = [
    { key: "billed", label: "Billed", color: "--chart-1", format: formatCurrency },
    { key: "collected", label: "Collected", color: "--chart-2", format: formatCurrency },
  ];

  return (
    <ChartCard
      title="Fee collection"
      description="Invoiced against received, by month."
      series={series}
      rows={data}
      labelKey="month"
      labelHeader="Month"
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {/* Grouped, never stacked: billed and collected overlap in meaning,
              so stacking them would imply a total that doesn't exist. Both
              are rupees on one axis — never a second y-scale. */}
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barGap={2}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" {...AXIS} />
            <YAxis
              {...AXIS}
              width={56}
              tickFormatter={(value: number) =>
                value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
              }
            />
            <Tooltip
              content={<ChartTooltip series={series} />}
              cursor={{ fill: "var(--surface-hover)" }}
            />
            <Bar dataKey="billed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="collected" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function ClassAttendanceChart({
  data,
}: {
  data: { label: string; percent: number }[];
}) {
  const series: ChartSeries[] = [
    { key: "percent", label: "Attendance", color: "--chart-1", format: (v) => formatPercent(v, 1) },
  ];

  return (
    <ChartCard
      title="Attendance by class"
      description="Average attendance for each section this year."
      series={series}
      rows={data}
      labelKey="label"
      labelHeader="Class"
    >
      <div className="w-full" style={{ height: Math.max(240, data.length * 28) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid {...GRID} vertical horizontal={false} />
            <XAxis type="number" domain={[0, 100]} {...AXIS} tickFormatter={(v: number) => `${v}%`} />
            <YAxis type="category" dataKey="label" {...AXIS} width={92} />
            <Tooltip content={<ChartTooltip series={series} />} cursor={{ fill: "var(--surface-hover)" }} />
            <Bar dataKey="percent" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {/*
                Colour here encodes a threshold, not identity, so it uses the
                reserved status palette rather than a categorical slot — and
                the number is on the axis and in the tooltip either way, so
                nothing rests on colour alone.
              */}
              {data.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={
                    entry.percent >= 85
                      ? "var(--success)"
                      : entry.percent >= 70
                        ? "var(--warning)"
                        : "var(--danger)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
