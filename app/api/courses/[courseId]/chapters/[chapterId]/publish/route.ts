import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        // Allow course owner or admin
        const courseOwner = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
            }
        });

        if (!courseOwner) {
            return new NextResponse("Course not found", { status: 404 });
        }

        // Check if user is the course owner, admin, or supervisor
        if (courseOwner.userId !== userId && user?.role !== "ADMIN" && user?.role !== "SUPERVISOR") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const chapter = await db.chapter.findUnique({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            }
        });

        if (!chapter) {
            return new NextResponse("Not Found", { status: 404 });
        }

        const publishedChapter = await db.chapter.update({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            data: {
                isPublished: !chapter.isPublished,
            }
        });

        return NextResponse.json(publishedChapter);
    } catch (error) {
        console.log("[CHAPTER_PUBLISH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 