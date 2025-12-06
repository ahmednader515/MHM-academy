import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get all submissions for an activity (teacher view)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ activityId: string }> }
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

    // Verify activity exists and teacher owns the course
    const activity = await db.activity.findUnique({
      where: {
        id: resolvedParams.activityId,
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

    if (!activity) {
      return new NextResponse("Activity not found", { status: 404 });
    }

    // If teacher, verify they own the course
    if (user.role === "TEACHER" && activity.chapter.course.userId !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get all submissions for this activity
    const submissions = await db.activitySubmission.findMany({
      where: {
        activityId: resolvedParams.activityId,
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
        activity: {
          select: {
            id: true,
            title: true,
            chapter: {
              select: {
                id: true,
                title: true,
                position: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.log("[TEACHER_ACTIVITY_SUBMISSIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

