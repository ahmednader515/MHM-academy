import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
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
        
        // Check if user is admin, supervisor, or course owner
        const whereClause = (user?.role === "ADMIN" || user?.role === "SUPERVISOR")
            ? { id: resolvedParams.courseId }
            : { id: resolvedParams.courseId, userId };

        const courseOwner = await db.course.findUnique({
            where: whereClause
        });

        if (!courseOwner) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { url } = await req.json();

        if (!url) {
            return new NextResponse("Missing URL", { status: 400 });
        }

        // Update chapter with video URL and set videoType to UPLOAD
        await db.chapter.update({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            data: {
                videoUrl: url,
                videoType: "UPLOAD",
                youtubeVideoId: null, // Clear any YouTube video ID
            }
        });

        return NextResponse.json({ 
            success: true,
            url: url
        });
    } catch (error) {
        console.log("[CHAPTER_UPLOAD]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 