import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get all homework submissions for a chapter (teacher view)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user;

    // Check if user is teacher or admin
    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
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

// PATCH - Update homework submission with corrected image
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user;

    // Check if user is teacher, admin, or supervisor
    if (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { homeworkId, correctedImageUrl } = await req.json();

    if (!homeworkId || !correctedImageUrl) {
      return new NextResponse("Homework ID and corrected image URL are required", { status: 400 });
    }

    // Get homework submission
    const homework = await db.homeworkSubmission.findUnique({
      where: {
        id: homeworkId,
      },
      include: {
        chapter: {
          include: {
            course: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!homework) {
      return new NextResponse("Homework submission not found", { status: 404 });
    }

    // Verify teacher owns the course (unless admin/supervisor)
    if (user.role === "TEACHER" && homework.chapter.course.userId !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get current corrected images array (handle both old and new schema)
    const currentImages = (homework as any).correctedImageUrls || 
                         ((homework as any).correctedImageUrl ? [(homework as any).correctedImageUrl] : []);

    // Append new image to the array (don't replace)
    const updatedImages = [...currentImages, correctedImageUrl];

    // Update homework with corrected images array
    const updatedHomework = await db.homeworkSubmission.update({
      where: {
        id: homeworkId,
      },
      data: {
        correctedImageUrls: updatedImages,
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
    });

    return NextResponse.json(updatedHomework);
  } catch (error) {
    console.error("[TEACHER_HOMEWORK_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

