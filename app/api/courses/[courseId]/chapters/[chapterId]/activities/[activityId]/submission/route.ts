import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Submit activity work
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string; activityId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new NextResponse("Image URL is required", { status: 400 });
    }

    // Verify activity exists and user has access
    const activity = await db.activity.findUnique({
      where: {
        id: resolvedParams.activityId,
      },
      include: {
        chapter: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!activity || activity.chapterId !== resolvedParams.chapterId) {
      return new NextResponse("Activity not found", { status: 404 });
    }

    // Check if user has access to the course
    const hasAccess = activity.chapter.isFree || await db.purchase.findFirst({
      where: {
        userId,
        courseId: resolvedParams.courseId,
        status: "ACTIVE",
      },
    });

    if (!hasAccess) {
      return new NextResponse("Access denied", { status: 403 });
    }

    // Create or update activity submission
    const existingSubmission = await db.activitySubmission.findFirst({
      where: {
        studentId: userId,
        activityId: resolvedParams.activityId,
      },
    });

    const submission = existingSubmission
      ? await db.activitySubmission.update({
          where: {
            id: existingSubmission.id,
          },
          data: {
            imageUrl,
            updatedAt: new Date(),
          },
        })
      : await db.activitySubmission.create({
          data: {
            studentId: userId,
            activityId: resolvedParams.activityId,
            imageUrl,
          },
        });

    return NextResponse.json(submission);
  } catch (error) {
    console.log("[ACTIVITY_SUBMIT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// GET - Get activity submission for current user
export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string; activityId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const submission = await db.activitySubmission.findFirst({
      where: {
        studentId: userId,
        activityId: resolvedParams.activityId,
      },
    });

    return NextResponse.json(submission || null);
  } catch (error) {
    console.log("[ACTIVITY_SUBMISSION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

