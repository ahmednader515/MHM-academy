import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasSubscriptionAccess } from "@/lib/subscription-utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; livestreamId: string }> }
) {
  const resolvedParams = await params;
  const { courseId, livestreamId } = resolvedParams;
  
  try {
    const session = await auth();

    console.log("[COURSE_LIVESTREAM_GET] Request received:", { courseId, livestreamId });

    if (!session?.user?.id || !session?.user) {
      console.log("[COURSE_LIVESTREAM_GET] Unauthorized - no session");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    console.log("[COURSE_LIVESTREAM_GET] User authenticated:", { userId, role: session.user.role });

    // Check if user has access to the course
    const course = await db.course.findFirst({
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
    let hasAccess = course.isFree || course.purchases.length > 0;
    
    // If no purchase access, check subscription
    if (!hasAccess && !course.isFree) {
      hasAccess = await hasSubscriptionAccess(userId, course);
    }
    
    if (!hasAccess) {
      return new NextResponse("Access denied", { status: 403 });
    }

    // Get the live stream
    console.log("[COURSE_LIVESTREAM_GET] Fetching livestream:", { livestreamId, courseId });
    const liveStream = await db.liveStream.findFirst({
      where: {
        id: livestreamId,
        courseId: courseId,
        isPublished: true
      }
    });

    if (!liveStream) {
      console.log("[COURSE_LIVESTREAM_GET] Livestream not found. Checking if it exists unpublished...");
      // Check if livestream exists but is unpublished
      const unpublishedStream = await db.liveStream.findFirst({
        where: {
          id: livestreamId,
          courseId: courseId
        },
        select: { id: true, isPublished: true, meetingType: true }
      });
      
      if (unpublishedStream) {
        console.log("[COURSE_LIVESTREAM_GET] Livestream exists but is unpublished:", unpublishedStream);
        return new NextResponse("Live stream not published", { status: 404 });
      }
      
      console.log("[COURSE_LIVESTREAM_GET] Livestream does not exist at all");
      return new NextResponse("Live stream not found", { status: 404 });
    }

    console.log("[COURSE_LIVESTREAM_GET] Livestream found:", { 
      id: liveStream.id, 
      title: liveStream.title,
      meetingType: liveStream.meetingType,
      isPublished: liveStream.isPublished 
    });

    // Check if livestream is expired (for students only)
    const isExpired = liveStream.scheduledAt && liveStream.duration
      ? new Date() > new Date(new Date(liveStream.scheduledAt).getTime() + liveStream.duration * 60 * 1000)
      : false;

    if (isExpired) {
      return new NextResponse("Live stream has ended", { status: 410 });
    }

    // Get all course content to determine navigation
    // Note: LiveStreams don't have a position field, so we'll use createdAt for ordering
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
    type ContentItem = { id: string; position: number; type: 'chapter' | 'quiz' | 'livestream' };
    const allContent: ContentItem[] = [
      ...chapters.map((c: { id: string; position: number }) => ({ id: c.id, position: c.position, type: 'chapter' as const })),
      ...quizzes.map((q: { id: string; position: number }) => ({ id: q.id, position: q.position, type: 'quiz' as const })),
      ...liveStreams.map((l: { id: string; position: number }) => ({ 
        id: l.id, 
        position: l.position,
        type: 'livestream' as const 
      }))
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
    console.error("[COURSE_LIVESTREAM_GET] Error details:", {
      courseId: resolvedParams.courseId,
      livestreamId: resolvedParams.livestreamId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
