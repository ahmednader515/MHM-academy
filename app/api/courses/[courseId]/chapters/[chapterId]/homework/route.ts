import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasSubscriptionAccess } from "@/lib/subscription-utils";

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
    let hasAccess = chapter.isFree || await db.purchase.findFirst({
      where: {
        userId,
        courseId: resolvedParams.courseId,
        status: "ACTIVE",
      },
    });

    // If no purchase access, check subscription
    if (!hasAccess && !chapter.isFree) {
      hasAccess = await hasSubscriptionAccess(userId, chapter.course);
    }

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

    if (existingHomework) {
      // Get current images array (handle both old and new schema)
      const currentImages = (existingHomework as any).imageUrls || 
                           ((existingHomework as any).imageUrl ? [(existingHomework as any).imageUrl] : []);

      // Append new image to the array (don't replace)
      const updatedImages = [...currentImages, imageUrl];

      const homework = await db.homeworkSubmission.update({
        where: {
          id: existingHomework.id,
        },
        data: {
          imageUrls: updatedImages,
          imageUrl: imageUrl, // Keep for backward compatibility
          updatedAt: new Date(),
        },
      });

      return NextResponse.json(homework);
    } else {
      // Create new submission with array
      const homework = await db.homeworkSubmission.create({
        data: {
          studentId: userId,
          chapterId: resolvedParams.chapterId,
          imageUrls: [imageUrl],
          imageUrl: imageUrl, // Keep for backward compatibility
        },
      });

      return NextResponse.json(homework);
    }

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

