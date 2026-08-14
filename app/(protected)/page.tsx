import { requireAuth } from "@/lib/auth/current-user";
import { PrincipalDashboard } from "@/components/dashboards/PrincipalDashboard";
import { TeacherDashboard } from "@/components/dashboards/TeacherDashboard";
import { StudentDashboard } from "@/components/dashboards/StudentDashboard";
import { ParentDashboard } from "@/components/dashboards/ParentDashboard";

export default async function DashboardPage() {
  const session = await requireAuth();

  switch (session.role) {
    case "PRINCIPAL":
      return <PrincipalDashboard />;
    case "TEACHER":
      return <TeacherDashboard userId={session.userId} />;
    case "STUDENT":
      return <StudentDashboard userId={session.userId} />;
    case "PARENT":
      return <ParentDashboard userId={session.userId} />;
  }
}
