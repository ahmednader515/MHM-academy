import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get all homework submissions for a chapter (teacher view)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is teacher or admin
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get chapter and verify teacher owns the course
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

    // If user is admin, allow access. If teacher, verify they own the course
    if (user.role === "TEACHER" && chapter.course.userId !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get all homework submissions for this chapter
    const homeworkSubmissions = await db.homeworkSubmission.findMany({
      where: {
        chapterId: resolvedParams.chapterId,
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        chapter: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(homeworkSubmissions);
  } catch (error) {
    console.log("[TEACHER_HOMEWORK_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

