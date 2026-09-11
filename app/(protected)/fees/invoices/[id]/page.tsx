import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { assertCanViewStudent } from "@/lib/auth/rbac";
import { getInvoiceDetail } from "@/lib/queries/fees";
import { getBrandingSettings } from "@/lib/branding";
import { formatCurrency, formatDate, formatDateTime, humanizeEnum } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrintButton } from "@/components/ui/PrintButton";
import { InvoiceStatusBadge } from "@/components/fees/InvoiceStatusBadge";
import { RecordPaymentButton } from "@/components/fees/RecordPaymentDialog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const invoice = await getInvoiceDetail(id);
  return { title: `Invoice ${invoice.invoiceNumber}` };
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className={bold ? "text-sm font-semibold text-fg" : "text-sm text-fg-muted"}>{label}</span>
      <span
        className={
          bold ? "text-sm font-semibold tabular-nums text-fg" : "text-sm tabular-nums text-fg-muted"
        }
      >
        {value}
      </span>
    </div>
  );
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  const invoice = await getInvoiceDetail(id);

  // A guardian or student may only open an invoice belonging to a student
  // they're entitled to see.
  await assertCanViewStudent(session, invoice.studentId);

  const branding = await getBrandingSettings();
  const amountPaid = invoice.payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
  const balance = invoice.totalAmount - amountPaid;
  const enrollment = invoice.student.enrollments[0];
  const sectionLabel = enrollment
    ? `${enrollment.section.class.name} — ${enrollment.section.name}`
    : "—";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Fees", href: "/fees" }, { label: invoice.invoiceNumber }]}
        title={`Invoice ${invoice.invoiceNumber}`}
        description={
          <>
            <Link href={`/students/${invoice.studentId}`} className="hover:text-brand">
              {invoice.student.user.name}
            </Link>
            {" · "}
            {sectionLabel}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <PrintButton label="Print" />
            {session.role === "PRINCIPAL" && (
              <RecordPaymentButton invoiceId={invoice.id} balance={balance} />
            )}
          </div>
        }
      />

      {/* Print-only header so a printed challan identifies itself. */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{branding.schoolName}</h1>
        {branding.address && <p className="text-sm">{branding.address}</p>}
        <p className="mt-2 text-sm">Fee invoice {invoice.invoiceNumber}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-line">
              <Line
                label={invoice.feeStructure?.feeCategory.name ?? "Fee"}
                value={formatCurrency(invoice.amount)}
              />
              {invoice.discount > 0 && (
                <Line label="Discount" value={`− ${formatCurrency(invoice.discount)}`} />
              )}
              {invoice.lateFee > 0 && (
                <Line label="Late fee" value={`+ ${formatCurrency(invoice.lateFee)}`} />
              )}
              <Line label="Total payable" value={formatCurrency(invoice.totalAmount)} bold />
              <Line label="Paid to date" value={formatCurrency(amountPaid)} />
              <Line label="Balance" value={formatCurrency(balance)} bold />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-fg-muted">Status</span>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-fg-muted">Due date</span>
              <span className="text-fg">{formatDate(invoice.dueDate)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-fg-muted">Issued</span>
              <span className="text-fg">{formatDate(invoice.issuedAt)}</span>
            </div>
            {invoice.term && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-fg-muted">Term</span>
                <span className="text-fg">{invoice.term.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-fg-muted">Admission no.</span>
              <span className="text-fg">{invoice.student.admissionNumber}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments recorded"
              description="Payments received against this invoice will be listed here with their receipt numbers."
            />
          ) : (
            <ul className="divide-y divide-line">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">{payment.receiptNumber}</p>
                    <p className="text-xs text-fg-subtle">
                      {humanizeEnum(payment.paymentMethod)} · {formatDateTime(payment.paidAt)} ·
                      received by {payment.receivedBy.name}
                    </p>
                    {payment.notes && <p className="mt-0.5 text-xs text-fg-subtle">{payment.notes}</p>}
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-success">
                    {formatCurrency(payment.amountPaid)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
