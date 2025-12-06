import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CoursesTable } from "./_components/courses-table";
import { columns } from "./_components/columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TeacherCoursesContent } from "./_components/teacher-courses-content";

const CoursesPage = async () => {
    const { userId, user } = await auth();

    if (!userId) {
        return redirect("/");
    }

    // Ensure only teachers can access this page
    if (user?.role !== "TEACHER") {
        return redirect("/dashboard");
    }

    // Use _count to reduce data transfer and queries
    const courses = await db.course.findMany({
        where: {
            userId,
        },
        include: {
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
        publishedChaptersCount: course._count.chapters, // Approximate (reduces operations)
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
        />
    );
};

export default CoursesPage;