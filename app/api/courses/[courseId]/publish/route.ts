import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { grantCourseAccessToSubscriptions } from "@/lib/subscription-utils";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        // Check if user is admin, supervisor, or course owner
        const whereClause = (user.role === "ADMIN" || user.role === "SUPERVISOR")
            ? { id: resolvedParams.courseId }
            : { id: resolvedParams.courseId, userId };

        const course = await db.course.findUnique({
            where: whereClause,
            include: {
                chapters: true
            }
        });

        if (!course) {
            return new NextResponse("Not found", { status: 404 });
        }

        const hasPublishedChapters = course.chapters.some((chapter) => chapter.isPublished);

        if (!course.title || !course.description || !course.imageUrl || !hasPublishedChapters) {
            return new NextResponse("Missing required fields", { status: 401 });
        }

        const publishedCourse = await db.course.update({
            where: {
                id: resolvedParams.courseId
            },
            data: {
                isPublished: !course.isPublished
            }
        });

        // If course is being published, grant access to matching subscriptions
        if (publishedCourse.isPublished) {
            await grantCourseAccessToSubscriptions(resolvedParams.courseId, publishedCourse);
        }

        return NextResponse.json(publishedCourse);
    } catch (error) {
        console.log("[COURSE_PUBLISH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 