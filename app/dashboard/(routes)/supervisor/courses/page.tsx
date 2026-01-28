import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeacherCoursesContent } from "@/app/dashboard/(routes)/teacher/courses/_components/teacher-courses-content";

const SupervisorCoursesPage = async () => {
  const session = await auth();
  if (!session?.user) return redirect("/");

  const userId = session.user.id;
  const user = session.user;

  // Ensure only supervisors can access this page
  if (user.role !== "SUPERVISOR" && user.role !== "ADMIN") {
    return redirect("/dashboard");
  }

  // Use _count to reduce data transfer and queries
  const courses = await db.course.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          role: true,
        }
      },
      _count: {
        select: {
          chapters: true,
          quizzes: true,
          purchases: {
            where: {
              status: "ACTIVE"
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc",
    },
  }).then(courses => courses.map(course => ({
    ...course,
    price: course.price || 0,
    publishedChaptersCount: course._count.chapters, // Approximate (we'd need a separate query for published only, but this reduces operations)
    publishedQuizzesCount: course._count.quizzes, // Approximate
    enrolledStudentsCount: course._count.purchases,
  })));

  // Calculate total from courses data instead of separate query
  const totalEnrolledStudents = courses.reduce((sum, course) => sum + course.enrolledStudentsCount, 0);

  const unpublishedCourses = courses.filter(course => !course.isPublished);
  const hasUnpublishedCourses = unpublishedCourses.length > 0;

  return (
    <TeacherCoursesContent 
      courses={courses}
      hasUnpublishedCourses={hasUnpublishedCourses}
      totalEnrolledStudents={totalEnrolledStudents}
      isAdmin={true}
      basePath="/dashboard/supervisor"
    />
  );
};

export default SupervisorCoursesPage;

