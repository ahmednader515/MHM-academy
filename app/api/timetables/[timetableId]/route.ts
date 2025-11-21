import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateTimetableSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

// GET - Get a specific timetable
export async function GET(
  req: Request,
  { params }: { params: Promise<{ timetableId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;
    const { timetableId } = resolvedParams;

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const timetable = await db.timetable.findUnique({
      where: { id: timetableId },
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
    });

    if (!timetable) {
      return new NextResponse("Timetable not found", { status: 404 });
    }

    // Check permissions
    if (user.role === "ADMIN") {
      // Admin can see all timetables
    } else if (user.role === "TEACHER") {
      if (timetable.course.userId !== userId) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else if (user.role === "USER") {
      const enrollment = await db.purchase.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: timetable.courseId,
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

    return NextResponse.json(timetable);
  } catch (error) {
    console.error("[TIMETABLE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PATCH - Update a timetable (Admin only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ timetableId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;
    const { timetableId } = resolvedParams;

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const timetable = await db.timetable.findUnique({
      where: { id: timetableId },
    });

    if (!timetable) {
      return new NextResponse("Timetable not found", { status: 404 });
    }

    const body = await req.json();
    const validatedData = updateTimetableSchema.parse(body);

    // Validate time range if both times are provided
    if (validatedData.startTime && validatedData.endTime) {
      const [startHours, startMinutes] = validatedData.startTime.split(":").map(Number);
      const [endHours, endMinutes] = validatedData.endTime.split(":").map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;

      if (endTotalMinutes <= startTotalMinutes) {
        return new NextResponse("End time must be after start time", { status: 400 });
      }
    } else if (validatedData.startTime && !validatedData.endTime) {
      const [startHours, startMinutes] = validatedData.startTime.split(":").map(Number);
      const [endHours, endMinutes] = timetable.endTime.split(":").map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;

      if (endTotalMinutes <= startTotalMinutes) {
        return new NextResponse("End time must be after start time", { status: 400 });
      }
    } else if (!validatedData.startTime && validatedData.endTime) {
      const [startHours, startMinutes] = timetable.startTime.split(":").map(Number);
      const [endHours, endMinutes] = validatedData.endTime.split(":").map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;

      if (endTotalMinutes <= startTotalMinutes) {
        return new NextResponse("End time must be after start time", { status: 400 });
      }
    }

    const updatedTimetable = await db.timetable.update({
      where: { id: timetableId },
      data: validatedData,
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

    return NextResponse.json(updatedTimetable);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ errors: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("[TIMETABLE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Delete a timetable (Admin only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ timetableId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;
    const { timetableId } = resolvedParams;

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const timetable = await db.timetable.findUnique({
      where: { id: timetableId },
    });

    if (!timetable) {
      return new NextResponse("Timetable not found", { status: 404 });
    }

    await db.timetable.delete({
      where: { id: timetableId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[TIMETABLE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

