import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CoursesTable } from "@/app/dashboard/(routes)/teacher/courses/_components/courses-table";
import { columns as teacherColumns } from "@/app/dashboard/(routes)/teacher/courses/_components/columns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AdminCoursesTable } from "./_components/admin-courses-table";
import { AdminCoursesContent } from "./_components/admin-courses-content";

const AdminCoursesPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect("/");

  const courses = await db.course.findMany({
    include: {
      chapters: { select: { id: true, isPublished: true } },
      quizzes: { select: { id: true, isPublished: true } },
    },
    orderBy: { createdAt: "desc" },
  }).then(courses => courses.map(course => ({
    ...course,
    price: course.price || 0,
    publishedChaptersCount: course.chapters.filter(ch => ch.isPublished).length,
    publishedQuizzesCount: course.quizzes.filter(q => q.isPublished).length,
  })));

  return (
    <AdminCoursesContent courses={courses} />
  );
};

export default AdminCoursesPage;


