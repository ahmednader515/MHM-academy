import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get all timetables for a specific course
export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;
    const { courseId } = resolvedParams;

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if course exists
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        userId: true,
      },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    // Check permissions
    if (user.role === "ADMIN") {
      // Admin can see all timetables
    } else if (user.role === "TEACHER") {
      if (course.userId !== userId) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else if (user.role === "USER") {
      const enrollment = await db.purchase.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
          status: "ACTIVE",
        },
      });
      if (!enrollment) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const timetables = await db.timetable.findMany({
      where: { courseId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });

    return NextResponse.json(timetables);
  } catch (error) {
    console.error("[TIMETABLES_COURSE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

