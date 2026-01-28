import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TimetablesContent } from "../../admin/timetables/_components/timetables-content";

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SupervisorTimetablesPage = async () => {
  const session = await auth();
  if (!session?.user) return redirect("/");

  const userId = session.user.id;
  const user = session.user;

  // Ensure only supervisors can access this page
  if (user.role !== "SUPERVISOR" && user.role !== "ADMIN") {
    return redirect("/dashboard");
  }

  // Fetch timetables
  const timetables = await db.timetable.findMany({
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return <TimetablesContent timetables={timetables} />;
};

export default SupervisorTimetablesPage;

