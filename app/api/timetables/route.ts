import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createTimetableSchema = z.object({
  courseId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  title: z.string().min(1),
  description: z.string().optional(),
});

// GET - Get all timetables (filtered by role)
export async function GET(req: Request) {
  try {
    const { userId, user } = await auth();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    let whereClause: any = {};

    // Admin can see all timetables
    if (user.role === "ADMIN") {
      if (courseId) {
        whereClause.courseId = courseId;
      }
    }
    // Teacher can see timetables for their courses
    else if (user.role === "TEACHER") {
      const teacherCourses = await db.course.findMany({
        where: { userId },
        select: { id: true },
      });
      const courseIds = teacherCourses.map((c) => c.id);
      whereClause.courseId = { in: courseIds };
      if (courseId && courseIds.includes(courseId)) {
        whereClause.courseId = courseId;
      } else if (courseId && !courseIds.includes(courseId)) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }
    // Students can see timetables for courses they're enrolled in
    else if (user.role === "USER") {
      const enrolledCourses = await db.purchase.findMany({
        where: {
          userId,
          status: "ACTIVE",
        },
        select: { courseId: true },
      });
      const courseIds = enrolledCourses.map((p) => p.courseId);
      whereClause.courseId = { in: courseIds };
      if (courseId && courseIds.includes(courseId)) {
        whereClause.courseId = courseId;
      } else if (courseId && !courseIds.includes(courseId)) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const timetables = await db.timetable.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            userId: true,
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
    console.error("[TIMETABLES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Create a new timetable (Admin only)
export async function POST(req: Request) {
  try {
    const { userId, user } = await auth();

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const validatedData = createTimetableSchema.parse(body);

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id: validatedData.courseId },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    // Validate time range
    const [startHours, startMinutes] = validatedData.startTime.split(":").map(Number);
    const [endHours, endMinutes] = validatedData.endTime.split(":").map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    if (endTotalMinutes <= startTotalMinutes) {
      return new NextResponse("End time must be after start time", { status: 400 });
    }

    const timetable = await db.timetable.create({
      data: {
        courseId: validatedData.courseId,
        dayOfWeek: validatedData.dayOfWeek,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        title: validatedData.title,
        description: validatedData.description,
      },
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
    });

    return NextResponse.json(timetable);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ errors: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("[TIMETABLES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

