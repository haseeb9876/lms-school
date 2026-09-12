import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PrincipalDashboard } from "@/components/dashboards/PrincipalDashboard";
import { TeacherDashboard } from "@/components/dashboards/TeacherDashboard";
import { StudentDashboard } from "@/components/dashboards/StudentDashboard";
import { ParentDashboard } from "@/components/dashboards/ParentDashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireAuth();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { name: true },
  });

  // Four genuinely different landing pages rather than one dashboard with
  // sections hidden per role: what a principal needs to decide on a Monday
  // morning has almost nothing in common with what a student opens the app
  // to check.
  switch (session.role) {
    case "PRINCIPAL":
      return <PrincipalDashboard session={session} userName={user.name} />;
    case "TEACHER":
      return <TeacherDashboard userId={session.userId} userName={user.name} />;
    case "STUDENT":
      return <StudentDashboard userId={session.userId} userName={user.name} />;
    case "PARENT":
      return <ParentDashboard userId={session.userId} userName={user.name} />;
  }
}
