import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TimetableViewContent } from "../teacher/timetables/_components/timetable-view-content";

const StudentTimetablesPage = async () => {
  const session = await auth();
  if (!session?.user) return redirect("/");

  const userId = session.user.id;
  const user = session.user;

  // Ensure only students can access this page
  if (user.role !== "USER") {
    return redirect("/dashboard");
  }

  // Get student's enrolled courses
  const enrolledCourses = await db.purchase.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    select: { courseId: true },
  });

  const courseIds = enrolledCourses.map((p) => p.courseId);

  // Get timetables for enrolled courses with caching
  const timetables = courseIds.length > 0
    ? await db.timetable.findMany({
        where: {
          courseId: { in: courseIds },
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },
        orderBy: [
          { dayOfWeek: "asc" },
          { startTime: "asc" },
        ],
      })
    : [];

  return <TimetableViewContent timetables={timetables} role="student" />;
};

export default StudentTimetablesPage;

