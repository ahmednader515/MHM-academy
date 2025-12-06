import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get all activities for a chapter
export async function GET(
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

    // Verify chapter exists and user has access
    const chapter = await db.chapter.findUnique({
      where: {
        id: resolvedParams.chapterId,
        courseId: resolvedParams.courseId,
      },
      include: {
        course: true,
      },
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    // Check if user has access to the course
    const hasAccess = chapter.isFree || await db.purchase.findFirst({
      where: {
        userId,
        courseId: resolvedParams.courseId,
        status: "ACTIVE",
      },
    });

    if (!hasAccess) {
      return new NextResponse("Access denied", { status: 403 });
    }

    // Get all activities for this chapter
    const activities = await db.activity.findMany({
      where: {
        chapterId: resolvedParams.chapterId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.log("[ACTIVITIES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

