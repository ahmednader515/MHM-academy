import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TimetablesContent } from "./_components/timetables-content";

const AdminTimetablesPage = async () => {
  const { userId, user } = await auth();
  if (!userId) return redirect("/");

  // Ensure only admins can access this page
  if (user?.role !== "ADMIN") {
    return redirect("/dashboard");
  }

  // Fetch courses and timetables in parallel with caching
  const [courses, timetables] = await Promise.all([
    db.course.findMany({
      select: {
        id: true,
        title: true,
        targetCurriculum: true,
        targetLevel: true,
        targetLanguage: true,
        targetGrade: true,
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.timetable.findMany({
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
  ]);

  return <TimetablesContent courses={courses} timetables={timetables} />;
};

export default AdminTimetablesPage;

