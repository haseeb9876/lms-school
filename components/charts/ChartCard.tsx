"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ChartSeries {
  key: string;
  label: string;
  /** CSS custom property name for the series colour, e.g. "--chart-1". */
  color: string;
  format?: (value: number) => string;
}

/**
 * Shell shared by every chart: title, legend, and a toggle to the same data
 * as a table.
 *
 * The table isn't a nicety. Three of the light-mode series steps sit below
 * 3:1 against the surface, and the palette's own rules make a readable
 * non-colour path mandatory when that's true — the table is that path. It
 * also happens to be what anyone using a screen reader, or trying to read an
 * exact figure rather than a trend, actually wants.
 */
export function ChartCard({
  title,
  description,
  series,
  rows,
  labelKey,
  labelHeader,
  children,
  className,
}: {
  title: string;
  description?: string;
  series: ChartSeries[];
  /** The same rows the chart is plotting, for the table view. */
  rows: Record<string, string | number>[];
  labelKey: string;
  labelHeader: string;
  children: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <section className={cn("rounded-lg border border-line bg-surface-raised shadow-soft", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-fg-subtle">{description}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* A legend is present whenever there's more than one series, so
              identity never rests on colour alone. */}
          {series.length > 1 && (
            <ul className="flex flex-wrap items-center gap-3">
              {series.map((entry) => (
                <li key={entry.key} className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 flex-none rounded-sm"
                    style={{ background: `var(${entry.color})` }}
                  />
                  {entry.label}
                </li>
              ))}
            </ul>
          )}

          <div
            role="radiogroup"
            aria-label="Chart view"
            className="inline-flex items-center gap-0.5 rounded-md border border-line bg-surface-sunken p-0.5"
          >
            {(
              [
                { value: "chart", label: "Chart", icon: BarChart3 },
                { value: "table", label: "Table", icon: Table2 },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={view === option.value}
                aria-label={`${option.label} view`}
                title={`${option.label} view`}
                onClick={() => setView(option.value)}
                className={cn(
                  "rounded p-1.5 transition-colors",
                  view === option.value ? "bg-surface text-fg shadow-soft" : "text-fg-subtle hover:text-fg"
                )}
              >
                <option.icon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 pt-2">
        {view === "chart" ? (
          children
        ) : (
          <div className="scrollbar-subtle max-h-80 overflow-auto rounded-md border border-line">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-surface-sunken">
                <tr className="border-b border-line">
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                    {labelHeader}
                  </th>
                  {series.map((entry) => (
                    <th
                      key={entry.key}
                      scope="col"
                      data-numeric
                      className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-fg-subtle"
                    >
                      {entry.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-fg">{row[labelKey]}</td>
                    {series.map((entry) => {
                      const value = row[entry.key];
                      return (
                        <td key={entry.key} data-numeric className="px-3 py-2 text-right text-fg-muted">
                          {typeof value === "number" && entry.format
                            ? entry.format(value)
                            : String(value ?? "—")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/** Shared tooltip so every chart's hover layer reads identically. */
export function ChartTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  label?: string | number;
  series: ChartSeries[];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-line bg-surface-raised px-3 py-2 text-xs shadow-overlay">
      <p className="font-semibold text-fg">{label}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {payload.map((entry) => {
          const definition = series.find((s) => s.key === entry.dataKey);
          if (!definition || entry.value === undefined) return null;
          return (
            <li key={definition.key} className="flex items-center gap-1.5 text-fg-muted">
              <span
                aria-hidden="true"
                className="h-2 w-2 flex-none rounded-sm"
                style={{ background: `var(${definition.color})` }}
              />
              {definition.label}
              <span className="ml-auto pl-3 font-medium tabular-nums text-fg">
                {definition.format ? definition.format(entry.value) : entry.value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
