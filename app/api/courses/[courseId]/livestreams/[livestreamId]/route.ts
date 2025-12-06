import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; livestreamId: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;
    const { courseId, livestreamId } = resolvedParams;

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Check if user has access to the course
    const course = await db.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
      },
      include: {
        purchases: {
          where: {
            userId,
            status: "ACTIVE"
          }
        }
      }
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    // Check if user has access (course is free or user has purchased it)
    const hasAccess = course.isFree || course.purchases.length > 0;
    
    if (!hasAccess) {
      return new NextResponse("Access denied", { status: 403 });
    }

    // Get the live stream
    const liveStream = await db.liveStream.findUnique({
      where: {
        id: livestreamId,
        courseId: courseId,
        isPublished: true
      }
    });

    if (!liveStream) {
      return new NextResponse("Live stream not found", { status: 404 });
    }

    // Check if livestream is expired (for students only)
    const isExpired = liveStream.scheduledAt && liveStream.duration
      ? new Date() > new Date(new Date(liveStream.scheduledAt).getTime() + liveStream.duration * 60 * 1000)
      : false;

    if (isExpired) {
      return new NextResponse("Live stream has ended", { status: 410 });
    }

    // Get all course content to determine navigation
    const [chapters, quizzes, liveStreams] = await Promise.all([
      db.chapter.findMany({
        where: { courseId, isPublished: true },
        select: { id: true, position: true },
        orderBy: { position: 'asc' }
      }),
      db.quiz.findMany({
        where: { courseId, isPublished: true },
        select: { id: true, position: true },
        orderBy: { position: 'asc' }
      }),
      db.liveStream.findMany({
        where: { courseId, isPublished: true },
        select: { id: true, position: true },
        orderBy: { position: 'asc' }
      })
    ]);

    // Combine and sort all content by position
    const allContent = [
      ...chapters.map(c => ({ id: c.id, position: c.position, type: 'chapter' as const })),
      ...quizzes.map(q => ({ id: q.id, position: q.position, type: 'quiz' as const })),
      ...liveStreams.map(l => ({ id: l.id, position: l.position, type: 'livestream' as const }))
    ].sort((a, b) => a.position - b.position);

    // Find current livestream position
    const currentIndex = allContent.findIndex(c => c.id === livestreamId && c.type === 'livestream');
    
    const nextContent = currentIndex >= 0 && currentIndex < allContent.length - 1
      ? allContent[currentIndex + 1]
      : null;
    
    const previousContent = currentIndex > 0
      ? allContent[currentIndex - 1] 
      : null;

    const response = {
      ...liveStream,
      nextChapterId: nextContent?.id || null,
      previousChapterId: previousContent?.id || null,
      nextContentType: nextContent?.type || null,
      previousContentType: previousContent?.type || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[COURSE_LIVESTREAM_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
