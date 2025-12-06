import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardUrlByRole } from "@/lib/utils";
import { DashboardWrapper } from "./_components/dashboard-wrapper";

const CoursesPage = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect("/");
  }

  // Redirect non-students to their role-specific dashboard
  if (session.user.role !== "USER") {
    const dashboardUrl = getDashboardUrlByRole(session.user.role);
    return redirect(dashboardUrl);
  }

  return <DashboardWrapper />;
}

export default CoursesPage; 