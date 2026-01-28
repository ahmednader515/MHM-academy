import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation";
import { CourseEditContent } from "./_components/course-edit-content";

export default async function SupervisorCourseIdPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const resolvedParams = await params;
    const { courseId } = resolvedParams;

    const session = await auth();

    if (!session?.user) {
        return redirect("/");
    }

    const userId = session.user.id;
    const user = session.user;

    // Only supervisor or admin can access this page
    if (user.role !== "SUPERVISOR" && user.role !== "ADMIN") {
        return redirect("/dashboard");
    }

    const course = await db.course.findUnique({
        where: {
            id: courseId,
        },
        include: {
            chapters: {
                orderBy: {
                    position: "asc" as const,
                },
            },
            quizzes: {
                orderBy: {
                    position: "asc" as const,
                },
            },
        }
    });

    if (!course) {
        return redirect("/dashboard/supervisor/courses");
    }

    const requiredFields = [
        course.title,
        course.description,
        course.imageUrl,
        course.isFree || (course.price !== null && course.price !== undefined),
        course.chapters.some((chapter: { isPublished: boolean }) => chapter.isPublished)
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
        price: course.isFree || (course.price !== null && course.price !== undefined),
        publishedChapters: course.chapters.some((chapter: { isPublished: boolean }) => chapter.isPublished)
    };

    return (
        <CourseEditContent
            course={course}
            completionText={completionText}
            isComplete={isComplete}
            completionStatus={completionStatus}
            isAdmin={true}
            basePath="/dashboard/supervisor"
        />
    );
}

