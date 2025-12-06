import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Create a new activity for a chapter (teacher only)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is teacher or admin
    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { title, description, isRequired } = await req.json();

    if (!title) {
      return new NextResponse("Title is required", { status: 400 });
    }

    // Verify chapter exists and teacher owns the course
    const chapter = await db.chapter.findUnique({
      where: {
        id: resolvedParams.chapterId,
      },
      include: {
        course: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    // If teacher, verify they own the course
    if (user.role === "TEACHER" && chapter.course.userId !== userId) {
      return new NextResponse("Forbidden - You don't own this course", { status: 403 });
    }

    // Create activity
    const activity = await db.activity.create({
      data: {
        chapterId: resolvedParams.chapterId,
        title,
        description: description || null,
        isRequired: isRequired !== undefined ? isRequired : true,
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.log("[ACTIVITY_CREATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// GET - Get all activities for a chapter (teacher view with submissions count)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is teacher or admin
    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Verify chapter exists and teacher owns the course
    const chapter = await db.chapter.findUnique({
      where: {
        id: resolvedParams.chapterId,
      },
      include: {
        course: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    // If teacher, verify they own the course
    if (user.role === "TEACHER" && chapter.course.userId !== userId) {
      return new NextResponse("Forbidden - You don't own this course", { status: 403 });
    }

    // Get all activities for this chapter
    const activities = await db.activity.findMany({
      where: {
        chapterId: resolvedParams.chapterId,
      },
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
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

