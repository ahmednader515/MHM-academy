import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeacherCoursesContent } from "@/app/dashboard/(routes)/teacher/courses/_components/teacher-courses-content";

const AdminCoursesPage = async () => {
  const { userId, user } = await auth();
  if (!userId) return redirect("/");

  // Ensure only admins can access this page
  if (user?.role !== "ADMIN") {
    return redirect("/dashboard");
  }

  const courses = await db.course.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          role: true,
        }
      },
      chapters: {
        select: {
          id: true,
          isPublished: true,
        }
      },
      quizzes: {
        select: {
          id: true,
          isPublished: true,
        }
      },
      purchases: {
        where: {
          status: "ACTIVE"
        },
        select: {
          id: true
        }
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  }).then(courses => courses.map(course => ({
    ...course,
    price: course.price || 0,
    publishedChaptersCount: course.chapters.filter(ch => ch.isPublished).length,
    publishedQuizzesCount: course.quizzes.filter(q => q.isPublished).length,
    enrolledStudentsCount: course.purchases.length,
  })));

  // Get total enrolled students across all courses
  const totalEnrolledStudents = await db.purchase.count({
    where: {
      status: "ACTIVE"
    },
  });

  const unpublishedCourses = courses.filter(course => !course.isPublished);
  const hasUnpublishedCourses = unpublishedCourses.length > 0;

  return (
    <TeacherCoursesContent 
      courses={courses}
      hasUnpublishedCourses={hasUnpublishedCourses}
      totalEnrolledStudents={totalEnrolledStudents}
      isAdmin={true}
    />
  );
};

export default AdminCoursesPage;


