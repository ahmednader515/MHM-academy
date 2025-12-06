import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TimetablesContent } from "./_components/timetables-content";

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AdminTimetablesPage = async () => {
  const session = await auth();
  if (!session?.user) return redirect("/");

  const userId = session.user.id;
  const user = session.user;

  // Ensure only admins can access this page
  if (user.role !== "ADMIN") {
    return redirect("/dashboard");
  }

  // Fetch courses and timetables in parallel
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

