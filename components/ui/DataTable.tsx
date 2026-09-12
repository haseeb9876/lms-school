import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<TRow> {
  /** Stable key — also used as the label on the mobile card layout. */
  key: string;
  header: string;
  cell: (row: TRow) => ReactNode;
  align?: "left" | "center" | "right";
  /** Renders with tabular figures so columns of numbers line up. */
  numeric?: boolean;
  /**
   * Keeps the column out of the mobile card layout. Use for supporting
   * detail — never for the row's identity.
   */
  hideOnMobile?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<TRow> {
  columns: Column<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow) => string;
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
  /** Describes the table for screen readers. */
  caption?: string;
  /** Wraps each mobile card / desktop row in a link or button. */
  rowHref?: (row: TRow) => string | undefined;
  className?: string;
}

const ALIGN: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * One table component for the whole app, with two layouts behind one API.
 *
 * Below `md` it renders stacked cards with each value labelled, because a
 * real table at phone width forces a horizontal scroll that hides the very
 * columns people came for — and teachers use this on phones far more than
 * on desktop. Above `md` it renders a genuine <table>, so screen readers and
 * keyboard navigation get proper row/column semantics.
 *
 * Deliberately a Server Component: tables of students, invoices and results
 * are read far more often than they're interacted with, so shipping zero
 * client JavaScript for them is the right default. Interactive behaviour
 * (sorting, filtering) is driven through URL search params by the pages that
 * need it, which also makes those views linkable and back-button friendly.
 */
export function DataTable<TRow>({
  columns,
  rows,
  getRowKey,
  empty,
  caption,
  rowHref,
  className,
}: DataTableProps<TRow>) {
  if (rows.length === 0 && empty) {
    return <div className={cn("rounded-lg border border-line bg-surface-raised", className)}>{empty}</div>;
  }

  const mobileColumns = columns.filter((column) => !column.hideOnMobile);
  const [primary, ...secondary] = mobileColumns;

  return (
    <div className={className}>
      {/* Mobile: stacked cards */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => {
          const href = rowHref?.(row);
          const content = (
            <>
              {primary && <div className="text-sm font-semibold text-fg">{primary.cell(row)}</div>}
              {secondary.length > 0 && (
                <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
                  {secondary.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                        {column.header}
                      </dt>
                      <dd className={cn("mt-0.5 text-sm text-fg-muted", column.numeric && "tabular-nums")}>
                        {column.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          );

          return (
            <li key={getRowKey(row)}>
              {href ? (
                <a
                  href={href}
                  className="block rounded-lg border border-line bg-surface-raised p-3.5 shadow-soft transition-colors hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {content}
                </a>
              ) : (
                <div className="rounded-lg border border-line bg-surface-raised p-3.5 shadow-soft">{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Desktop: real table semantics */}
      <div className="scrollbar-subtle hidden overflow-x-auto rounded-lg border border-line bg-surface-raised shadow-soft md:block">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line bg-surface-sunken">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  data-numeric={column.numeric || undefined}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle whitespace-nowrap",
                    ALIGN[column.align ?? (column.numeric ? "right" : "left")],
                    column.headerClassName
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={getRowKey(row)}
                  className={cn(
                    "border-b border-line last:border-0 transition-colors",
                    href ? "cursor-pointer hover:bg-surface-hover" : "hover:bg-surface-hover/60"
                  )}
                >
                  {columns.map((column, index) => (
                    <td
                      key={column.key}
                      data-numeric={column.numeric || undefined}
                      className={cn(
                        "px-4 py-3 text-fg-muted align-middle",
                        ALIGN[column.align ?? (column.numeric ? "right" : "left")],
                        column.cellClassName
                      )}
                    >
                      {/* Only the first cell carries the row link, so the row
                          is reachable with one tab stop instead of one per
                          column. */}
                      {href && index === 0 ? (
                        <a
                          href={href}
                          className="rounded font-medium text-fg hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                          {column.cell(row)}
                        </a>
                      ) : (
                        column.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
