import { GraduationCap, CalendarCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/ui/StatCard";

export async function StudentDashboard({ userId }: { userId: string }) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { section: { include: { class: true } } },
      },
    },
  });

  const currentEnrollment = profile?.enrollments[0];

  const [attendanceCount, presentCount] = profile
    ? await Promise.all([
        prisma.attendanceRecord.count({ where: { studentId: profile.id } }),
        prisma.attendanceRecord.count({ where: { studentId: profile.id, status: "PRESENT" } }),
      ])
    : [0, 0];

  const attendanceRate = attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Your dashboard</h1>
        <p className="text-sm text-neutral-500">
          {currentEnrollment
            ? `${currentEnrollment.section.class.name} · ${currentEnrollment.section.name}`
            : "Not yet enrolled in a class this year."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Attendance"
          value={attendanceRate === null ? "—" : `${attendanceRate}%`}
          icon={CalendarCheck}
          hint={attendanceCount === 0 ? "No attendance recorded yet" : undefined}
        />
        <StatCard label="Roll number" value={profile?.rollNumber ?? "—"} icon={GraduationCap} />
      </div>
    </div>
  );
}
