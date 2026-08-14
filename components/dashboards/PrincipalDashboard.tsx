import { Users, GraduationCap, Wallet, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/ui/StatCard";

export async function PrincipalDashboard() {
  const [studentCount, teacherCount, parentCount, pendingInvoices, openTickets] = await Promise.all([
    prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "TEACHER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "PARENT", status: "ACTIVE" } }),
    prisma.feeInvoice.count({ where: { status: { in: ["PENDING", "OVERDUE"] } } }),
    prisma.deskTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Principal dashboard</h1>
        <p className="text-sm text-neutral-500">A live snapshot of your school.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active students" value={studentCount} icon={GraduationCap} />
        <StatCard label="Teachers" value={teacherCount} icon={Users} />
        <StatCard label="Parent accounts" value={parentCount} icon={Users} />
        <StatCard label="Fees pending" value={pendingInvoices} icon={Wallet} />
      </div>

      {openTickets > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning">
          <MessageSquare className="h-4 w-4 flex-none" aria-hidden="true" />
          {openTickets} open desk ticket{openTickets === 1 ? "" : "s"} need attention.
        </div>
      )}
    </div>
  );
}
