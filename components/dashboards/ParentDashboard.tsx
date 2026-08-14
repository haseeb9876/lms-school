import { Users } from "lucide-react";
import { prisma } from "@/lib/db";

export async function ParentDashboard({ userId }: { userId: string }) {
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: userId },
    include: {
      student: {
        include: {
          user: true,
          enrollments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { section: { include: { class: true } } },
          },
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Your children</h1>
        <p className="text-sm text-neutral-500">A snapshot of each child linked to your account.</p>
      </div>

      {links.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-soft">
          <Users className="mx-auto mb-2 h-8 w-8 text-neutral-400" aria-hidden="true" />
          <p className="text-sm text-neutral-500">
            No children are linked to your account yet. Ask the school principal to link your child&apos;s record.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {links.map((link) => {
            const enrollment = link.student.enrollments[0];
            return (
              <div key={link.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-soft">
                <p className="text-sm font-semibold text-neutral-900">{link.student.user.name}</p>
                <p className="text-xs text-neutral-500">
                  {enrollment ? `${enrollment.section.class.name} · ${enrollment.section.name}` : "Not yet enrolled this year"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
