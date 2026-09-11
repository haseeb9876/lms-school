import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { listGuardians, type GuardianListRow } from "@/lib/queries/staff";
import { buildHref, readPage, readParam, type RawSearchParams } from "@/lib/search-params";
import { humanizeEnum } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/filters/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

export const metadata: Metadata = { title: "Guardians" };

export default async function GuardiansPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAuth(["PRINCIPAL"]);
  const params = await searchParams;

  const query = readParam(params, "q");
  const page = readPage(params);
  const { rows, total, pageSize } = await listGuardians({ query, page });

  const columns: Column<GuardianListRow>[] = [
    {
      key: "name",
      header: "Guardian",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{row.name}</p>
            <p className="truncate text-xs text-fg-subtle">{row.phone ?? row.email ?? "No contact"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "children",
      header: "Children",
      cell: (row) =>
        row.children.length === 0 ? (
          <span className="text-fg-subtle">Not linked</span>
        ) : (
          <div className="flex flex-col gap-1">
            {row.children.map((child) => (
              <Link
                key={child.id}
                href={`/students/${child.id}`}
                className="text-sm text-fg transition-colors hover:text-brand"
              >
                {child.name}
                <span className="ml-1.5 text-xs text-fg-subtle">{child.label}</span>
              </Link>
            ))}
          </div>
        ),
    },
    {
      key: "relationship",
      header: "Relationship",
      hideOnMobile: true,
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {[...new Set(row.children.map((child) => child.relationship))].map((relationship) => (
            <Badge key={relationship} variant="neutral">
              {humanizeEnum(relationship)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Account",
      cell: (row) =>
        row.status === "ACTIVE" ? (
          <Badge variant="success" dot>
            Active
          </Badge>
        ) : (
          <Badge variant="danger" dot>
            Suspended
          </Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Guardians"
        description="Parent and guardian accounts, and the students they can see."
      />

      <FilterBar
        search={
          <SearchInput placeholder="Search by guardian or child's name…" className="w-full sm:max-w-sm" />
        }
        clearHref={query ? "/guardians" : undefined}
      />

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Guardian accounts"
        empty={
          <EmptyState
            icon={Users}
            title={query ? "No guardians match that search" : "No guardians yet"}
            description={
              query
                ? "Try the guardian's name, their child's name, or a CNIC."
                : "Guardian accounts appear here once they've been created and linked to a student."
            }
          />
        }
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(nextPage) => buildHref("/guardians", params, { page: nextPage })}
      />
    </div>
  );
}
