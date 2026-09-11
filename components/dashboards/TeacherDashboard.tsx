import { BookOpen, Users2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/ui/StatCard";

export async function TeacherDashboard({ userId }: { userId: string }) {
  const assignments = await prisma.teacherSubjectAssignment.findMany({
    where: { teacherId: userId },
    include: { subject: true, section: { include: { class: true } } },
  });

  const sectionCount = new Set(assignments.map((a) => a.sectionId)).size;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Teacher dashboard</h1>
        <p className="text-sm text-fg-subtle">Your classes at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sections" value={sectionCount} icon={Users2} />
        <StatCard label="Subject assignments" value={assignments.length} icon={BookOpen} />
      </div>

      <div className="rounded-lg border border-line bg-surface-raised p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold text-fg">Your assignments</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-fg-subtle">
            You haven&apos;t been assigned to any classes yet. Ask the principal to assign you.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-fg">{a.subject.name}</span>
                <span className="text-fg-subtle">
                  {a.section.class.name} · {a.section.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
