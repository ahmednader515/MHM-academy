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
    const { userId } = await auth();

    if (!userId) {
        return redirect("/");
    }

    const courses = await db.course.findMany({
        where: {
            userId,
        },
        include: {
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
        }
    });

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