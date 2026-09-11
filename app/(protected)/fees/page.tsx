import type { Metadata } from "next";
import { AlertTriangle, Banknote, Receipt, Wallet } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { getFeeSummary, listInvoices, type InvoiceListRow } from "@/lib/queries/fees";
import { getSectionOptions } from "@/lib/queries/academics";
import { buildHref, readEnum, readPage, readParam, type RawSearchParams } from "@/lib/search-params";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatCard } from "@/components/ui/StatCard";
import { FilterBar } from "@/components/filters/FilterBar";
import { InvoiceStatusBadge } from "@/components/fees/InvoiceStatusBadge";

export const metadata: Metadata = { title: "Fees" };

const STATUSES = ["PENDING", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"] as const;

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth(["PRINCIPAL", "STUDENT", "PARENT"]);
  const params = await searchParams;

  const status = readEnum(params, "status", STATUSES);
  const sectionId = readParam(params, "section");
  const query = readParam(params, "q");
  const page = readPage(params);

  const isPrincipal = session.role === "PRINCIPAL";

  const [{ rows, total, pageSize }, summary, sections] = await Promise.all([
    listInvoices({ session, status, sectionId, query, page }),
    getFeeSummary(session),
    isPrincipal ? getSectionOptions() : Promise.resolve([]),
  ]);

  const collectionRate = summary.billed > 0 ? (summary.collected / summary.billed) * 100 : null;

  const columns: Column<InvoiceListRow>[] = [
    {
      key: "invoice",
      header: "Invoice",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{row.invoiceNumber}</p>
          {isPrincipal && (
            <p className="truncate text-xs text-fg-subtle">
              {row.studentName} · {row.sectionLabel}
            </p>
          )}
        </div>
      ),
    },
    { key: "due", header: "Due date", cell: (row) => formatDate(row.dueDate) },
    {
      key: "amount",
      header: "Amount",
      numeric: true,
      cell: (row) => formatCurrency(row.totalAmount),
    },
    {
      key: "paid",
      header: "Paid",
      numeric: true,
      hideOnMobile: true,
      cell: (row) => formatCurrency(row.amountPaid),
    },
    {
      key: "balance",
      header: "Balance",
      numeric: true,
      cell: (row) =>
        row.balance > 0 ? (
          <span className="font-medium text-danger">{formatCurrency(row.balance)}</span>
        ) : (
          <span className="text-success">Clear</span>
        ),
    },
    { key: "status", header: "Status", cell: (row) => <InvoiceStatusBadge status={row.status} /> },
  ];

  const hasFilters = Boolean(status || sectionId || query);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isPrincipal ? "Fees" : "My fees"}
        description={
          isPrincipal
            ? "Invoices, collections and outstanding balances across the school."
            : "Your fee invoices and payment history."
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Billed"
          value={formatCurrency(summary.billed)}
          icon={Receipt}
          tone="neutral"
        />
        <StatCard
          label="Collected"
          value={formatCurrency(summary.collected)}
          icon={Banknote}
          tone="success"
          hint={collectionRate === null ? undefined : `${formatPercent(collectionRate, 1)} of billed`}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(summary.outstanding)}
          icon={Wallet}
          tone={summary.outstanding > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Overdue invoices"
          value={summary.overdueCount}
          icon={AlertTriangle}
          tone={summary.overdueCount > 0 ? "danger" : "success"}
          invertTrend
          href={isPrincipal ? "/fees?status=OVERDUE" : undefined}
        />
      </div>

      <FilterBar
        search={
          isPrincipal ? (
            <SearchInput placeholder="Search invoice or student…" className="w-full sm:max-w-xs" />
          ) : undefined
        }
        filters={[
          {
            name: "status",
            label: "Status",
            value: status,
            placeholder: "All statuses",
            options: STATUSES.map((value) => ({
              value,
              label: value.charAt(0) + value.slice(1).toLowerCase(),
            })),
          },
          ...(isPrincipal
            ? [
                {
                  name: "section",
                  label: "Class",
                  value: sectionId,
                  placeholder: "All classes",
                  options: sections.map((s) => ({ value: s.id, label: s.label })),
                },
              ]
            : []),
        ]}
        clearHref={hasFilters ? "/fees" : undefined}
      />

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Fee invoices"
        rowHref={(row) => `/fees/invoices/${row.id}`}
        empty={
          <EmptyState
            icon={Receipt}
            title={hasFilters ? "No invoices match these filters" : "No invoices yet"}
            description={
              hasFilters
                ? "Try a different status, class or search term."
                : "Fee invoices will appear here once they've been issued."
            }
          />
        }
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(nextPage) => buildHref("/fees", params, { page: nextPage })}
      />
    </div>
  );
}
