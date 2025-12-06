import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TimetableViewContent } from "./_components/timetable-view-content";

const TeacherTimetablesPage = async () => {
  const { userId, user } = await auth();
  if (!userId) return redirect("/");

  // Ensure only teachers can access this page
  if (user?.role !== "TEACHER") {
    return redirect("/dashboard");
  }

  // Get teacher's courses
  const teacherCourses = await db.course.findMany({
    where: { userId },
    select: { id: true },
  });

  const courseIds = teacherCourses.map((c) => c.id);

  // Get timetables for teacher's courses with caching
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

  return <TimetableViewContent timetables={timetables} role="teacher" />;
};

export default TeacherTimetablesPage;

