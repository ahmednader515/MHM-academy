import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateTimetableSchema = z.object({
  imageUrl: z.string().min(1).optional(),
  targetCurriculum: z.string().optional().nullable(),
  targetCurriculumType: z.string().optional().nullable(), // نوع المنهج (morning/evening)
  targetGrade: z.string().optional().nullable(),
  targetSection: z.string().optional().nullable(),
  courseId: z.string().min(1).optional(),
});

// GET - Get a specific timetable
export async function GET(
  req: Request,
  { params }: { params: Promise<{ timetableId: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;
    const { timetableId } = resolvedParams;

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = session.user;

    const timetable = await db.timetable.findUnique({
      where: { id: timetableId },
    });

    if (!timetable) {
      return new NextResponse("Timetable not found", { status: 404 });
    }

    // Check permissions - students can only see timetables matching their profile
    if (user.role === "ADMIN" || user.role === "SUPERVISOR" || user.role === "TEACHER") {
      // Admin, Supervisor, and Teacher can see all timetables
    } else if (user.role === "USER") {
      // Check if timetable matches student's profile
      const matchesCurriculum = !timetable.targetCurriculum || timetable.targetCurriculum === user.curriculum;
      const matchesGrade = !timetable.targetGrade || 
        timetable.targetGrade === user.grade ||
        (user.grade && (
          timetable.targetGrade.includes(`,${user.grade},`) ||
          timetable.targetGrade.startsWith(`${user.grade},`) ||
          timetable.targetGrade.endsWith(`,${user.grade}`)
        ));
      const matchesSection = !timetable.targetSection || 
        timetable.targetSection === user.language ||
        (user.language && (
          timetable.targetSection.includes(`,${user.language},`) ||
          timetable.targetSection.startsWith(`${user.language},`) ||
          timetable.targetSection.endsWith(`,${user.language}`)
        ));

      if (!matchesCurriculum || !matchesGrade || !matchesSection) {
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

// PATCH - Update a timetable (Admin and Supervisor only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ timetableId: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;
    const { timetableId } = resolvedParams;

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = session.user;

    if (user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
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

    // Verify course exists if courseId is provided
    if (validatedData.courseId !== undefined) {
      const course = await db.course.findUnique({
        where: { id: validatedData.courseId },
      });
      if (!course) {
        return new NextResponse("Course not found", { status: 404 });
      }
    }

    const updatedTimetable = await db.timetable.update({
      where: { id: timetableId },
      data: {
        ...(validatedData.imageUrl && { imageUrl: validatedData.imageUrl }),
        targetCurriculum: validatedData.targetCurriculum !== undefined ? validatedData.targetCurriculum : timetable.targetCurriculum,
        targetCurriculumType: validatedData.targetCurriculumType !== undefined ? validatedData.targetCurriculumType : timetable.targetCurriculumType,
        targetGrade: validatedData.targetGrade !== undefined ? validatedData.targetGrade : timetable.targetGrade,
        targetSection: validatedData.targetSection !== undefined ? validatedData.targetSection : timetable.targetSection,
        ...(validatedData.courseId !== undefined && { courseId: validatedData.courseId }),
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

// DELETE - Delete a timetable (Admin and Supervisor only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ timetableId: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;
    const { timetableId } = resolvedParams;

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = session.user;

    if (user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
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
