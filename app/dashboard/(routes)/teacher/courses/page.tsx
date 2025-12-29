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
    const session = await auth();

    // Middleware handles authentication checks, so we only check role here
    // If user is not authenticated, middleware will redirect before we get here
    
    // If no user, return early - middleware will handle authentication
    // Don't redirect to avoid loops with middleware
    if (!session?.user) {
        // Return a simple loading message instead of redirecting
        // This prevents redirect loops - middleware will handle auth on next request
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading...</p>
            </div>
        );
    }

    const userId = session.user.id;
    const user = session.user;
    
    // Ensure only teachers can access this page
    if (user.role !== "TEACHER") {
        // If wrong role, redirect to appropriate dashboard
        const dashboardUrl = user.role === "ADMIN" 
            ? "/dashboard/admin/staff" 
            : "/dashboard";
        return redirect(dashboardUrl);
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