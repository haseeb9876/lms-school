import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { listTickets } from "@/lib/queries/helpdesk";
import { buildHref, readEnum, readPage, type RawSearchParams } from "@/lib/search-params";
import { formatRelativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { FilterBar } from "@/components/filters/FilterBar";
import { NewTicketButton } from "@/components/helpdesk/NewTicketDialog";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/helpdesk/TicketBadges";

export const metadata: Metadata = { title: "Help Desk" };

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export default async function HelpDeskPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth();
  const params = await searchParams;

  const status = readEnum(params, "status", STATUSES);
  const page = readPage(params);

  const { tickets, total, pageSize } = await listTickets({ session, status, page });
  const isPrincipal = session.role === "PRINCIPAL";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Help Desk"
        description={
          isPrincipal
            ? "Every ticket raised across the school."
            : "Your support tickets and their replies."
        }
        actions={<NewTicketButton />}
      />

      <FilterBar
        filters={[
          {
            name: "status",
            label: "Status",
            value: status,
            placeholder: "All statuses",
            options: STATUSES.map((value) => ({
              value,
              label: value === "IN_PROGRESS" ? "In progress" : value.charAt(0) + value.slice(1).toLowerCase(),
            })),
          },
        ]}
        clearHref={status ? "/helpdesk" : undefined}
      />

      <DataTable
        rows={tickets}
        getRowKey={(row) => row.id}
        caption="Help desk tickets"
        rowHref={(row) => `/helpdesk/${row.id}`}
        columns={[
          {
            key: "subject",
            header: "Ticket",
            cell: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{row.subject}</p>
                <p className="truncate text-xs text-fg-subtle">
                  {row.category ?? "Uncategorised"}
                  {isPrincipal ? ` · ${row.raisedBy.name}` : ""} · {row._count.messages} message
                  {row._count.messages === 1 ? "" : "s"}
                </p>
              </div>
            ),
          },
          { key: "status", header: "Status", cell: (row) => <TicketStatusBadge status={row.status} /> },
          {
            key: "priority",
            header: "Priority",
            hideOnMobile: true,
            cell: (row) => <TicketPriorityBadge priority={row.priority} />,
          },
          {
            key: "opened",
            header: "Opened",
            cell: (row) => formatRelativeTime(row.createdAt),
          },
          {
            key: "assigned",
            header: "Assigned to",
            hideOnMobile: true,
            cell: (row) => row.assignedTo?.name ?? <span className="text-fg-subtle">Unassigned</span>,
          },
        ]}
        empty={
          <EmptyState
            icon={LifeBuoy}
            title={status ? "No tickets with that status" : "No tickets yet"}
            description={
              status
                ? "Try a different status filter."
                : "Open a ticket and the school office will get back to you here."
            }
          />
        }
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(nextPage) => buildHref("/helpdesk", params, { page: nextPage })}
      />
    </div>
  );
}
