import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Submit homework
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

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new NextResponse("Image URL is required", { status: 400 });
    }

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

    // Create or update homework submission
    const existingHomework = await db.homeworkSubmission.findFirst({
      where: {
        studentId: userId,
        chapterId: resolvedParams.chapterId,
      },
    });

    const homework = existingHomework
      ? await db.homeworkSubmission.update({
          where: {
            id: existingHomework.id,
          },
          data: {
            imageUrl,
            updatedAt: new Date(),
          },
        })
      : await db.homeworkSubmission.create({
          data: {
            studentId: userId,
            chapterId: resolvedParams.chapterId,
            imageUrl,
          },
        });

    return NextResponse.json(homework);
  } catch (error) {
    console.log("[HOMEWORK_SUBMIT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// GET - Get homework for current user
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

    const homework = await db.homeworkSubmission.findFirst({
      where: {
        studentId: userId,
        chapterId: resolvedParams.chapterId,
      },
    });

    return NextResponse.json(homework || null);
  } catch (error) {
    console.log("[HOMEWORK_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

