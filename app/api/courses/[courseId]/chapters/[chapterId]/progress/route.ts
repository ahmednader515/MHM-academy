import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
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

    // Check if this chapter is already completed to avoid duplicate points
    const existingProgress = await db.userProgress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
    });

    const userProgress = await db.userProgress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
      update: {
        isCompleted: true,
      },
      create: {
        userId,
        chapterId: resolvedParams.chapterId,
        isCompleted: true,
      },
    });

    // Award points only if this is the first time completing the chapter
    if (!existingProgress || !existingProgress.isCompleted) {
      try {
        await db.user.update({
          where: { id: userId },
          data: {
            points: {
              increment: 10,
            },
          },
        });
      } catch (error) {
        // Points column doesn't exist yet, skip awarding points
        console.log("Points column doesn't exist yet, skipping points award");
      }
    }

    return NextResponse.json(userProgress);
  } catch (error) {
    console.log("[CHAPTER_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
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

    // First check if the record exists
    const existingProgress = await db.userProgress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
    });

    if (!existingProgress) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Deduct points if the chapter was completed (to avoid negative points, check if user has enough points)
    if (existingProgress.isCompleted) {
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { points: true },
        });

        if (user && user.points >= 10) {
          await db.user.update({
            where: { id: userId },
            data: {
              points: {
                decrement: 10,
              },
            },
          });
        }
      } catch (error) {
        // Points column doesn't exist yet, skip deducting points
        console.log("Points column doesn't exist yet, skipping points deduction");
      }
    }

    await db.userProgress.delete({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[CHAPTER_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 