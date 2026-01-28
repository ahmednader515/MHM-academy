import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation";
import { CourseEditContent } from "./_components/course-edit-content";

export default async function CourseIdPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const resolvedParams = await params;
    const { courseId } = resolvedParams;

    const session = await auth();

    if (!session?.user) {
        return redirect("/sign-in");
    }

    const userId = session.user.id;
    const user = session.user;

    // Ensure only teachers can access this page
    if (user.role !== "TEACHER") {
        const dashboardUrl = user.role === "ADMIN" 
            ? "/dashboard/admin/staff" 
            : "/dashboard";
        return redirect(dashboardUrl);
    }

    const course = await db.course.findUnique({
        where: {
            id: courseId,
        },
        include: {
            chapters: {
                orderBy: {
                    position: "asc",
                },
            },
            quizzes: {
                orderBy: {
                    position: "asc",
                },
            },
        },
    });

    if (!course) {
        return redirect("/dashboard/teacher/courses");
    }

    // Only owner or admin can view editor
    if (user?.role !== "ADMIN" && course.userId !== userId) {
        return redirect("/dashboard");
    }

    const requiredFields = [
        course.title,
        course.description,
        course.imageUrl,
        course.chapters.some(chapter => chapter.isPublished)
    ];

    const totalFields = requiredFields.length;
    const completedFields = requiredFields.filter(Boolean).length;

    const completionText = `(${completedFields}/${totalFields})`;

    const isComplete = requiredFields.every(Boolean);

    // Create detailed completion status
    const completionStatus = {
        title: !!course.title,
        description: !!course.description,
        imageUrl: !!course.imageUrl,
        publishedChapters: course.chapters.some(chapter => chapter.isPublished)
    };

    return (
        <CourseEditContent
            course={course}
            completionText={completionText}
            isComplete={isComplete}
            completionStatus={completionStatus}
            userRole={user?.role}
        />
    );
}