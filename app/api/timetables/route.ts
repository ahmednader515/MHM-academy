import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createTimetableSchema = z.object({
  imageUrl: z.string().min(1),
  targetCurriculum: z.string().optional().nullable(),
  targetCurriculumType: z.string().optional().nullable(), // نوع المنهج (morning/evening)
  targetGrade: z.string().optional().nullable(),
  targetSection: z.string().optional().nullable(), // القسم (language: arabic/languages)
  courseId: z.string().min(1),
});

// GET - Get all timetables (filtered by role and student profile)
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user;

    let whereClause: any = {};

    // Admin and Supervisor can see all timetables
    if (user.role === "ADMIN" || user.role === "SUPERVISOR") {
      // No filtering - show all
    }
    // Teacher can see all timetables (for now, can be restricted later)
    else if (user.role === "TEACHER") {
      // Show all timetables
    }
    // Students see timetables matching their profile
    else if (user.role === "USER") {
      const conditions: any[] = [];

      // Curriculum: if user has curriculum, timetable must either not specify curriculum or match user's curriculum
      if (user.curriculum) {
        conditions.push({
          OR: [
            { targetCurriculum: null },
            { targetCurriculum: user.curriculum },
          ],
        });
      } else {
        // If user has no curriculum, only show timetables with no curriculum specified
        conditions.push({ targetCurriculum: null });
      }

      // Curriculum Type: if user has curriculumType, timetable must either not specify curriculumType or match user's curriculumType
      // If user doesn't have curriculumType, show all timetables (both with and without targetCurriculumType)
      if (user.curriculumType) {
        conditions.push({
          OR: [
            { targetCurriculumType: null },
            { targetCurriculumType: user.curriculumType },
          ],
        });
      }
      // If user has no curriculumType, don't filter by targetCurriculumType (show all)

      // Grade: if user has grade, timetable must either not specify grade or match user's grade
      // Handle comma-separated grades
      if (user.grade) {
        const userGrade = user.grade;
        conditions.push({
          OR: [
            { targetGrade: null },
            { targetGrade: userGrade }, // Exact match for single grade
            // Check if user's grade is included in comma-separated targetGrade
            {
              targetGrade: {
                contains: `,${userGrade},`,
              },
            },
            {
              targetGrade: {
                startsWith: `${userGrade},`,
              },
            },
            {
              targetGrade: {
                endsWith: `,${userGrade}`,
              },
            },
          ],
        });
      } else {
        conditions.push({ targetGrade: null });
      }

      // Section (Language): if user has language, timetable must either not specify section or match user's language
      // Handle comma-separated sections
      if (user.language) {
        const userLanguage = user.language;
        conditions.push({
          OR: [
            { targetSection: null },
            { targetSection: userLanguage }, // Exact match for single section
            // Check if user's language is included in comma-separated targetSection
            {
              targetSection: {
                contains: `,${userLanguage},`,
              },
            },
            {
              targetSection: {
                startsWith: `${userLanguage},`,
              },
            },
            {
              targetSection: {
                endsWith: `,${userLanguage}`,
              },
            },
          ],
        });
      } else {
        conditions.push({ targetSection: null });
      }

      // All conditions must be met (AND)
      if (conditions.length > 0) {
        whereClause.AND = conditions;
      }
    } else {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const timetables = await db.timetable.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(timetables);
  } catch (error) {
    console.error("[TIMETABLES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Create a new timetable (Admin and Supervisor only)
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = session.user;

    if (user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const validatedData = createTimetableSchema.parse(body);

    if (!validatedData.imageUrl) {
      return new NextResponse("Image URL is required", { status: 400 });
    }

    if (!validatedData.courseId) {
      return new NextResponse("Course ID is required", { status: 400 });
    }

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id: validatedData.courseId },
    });
    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    const timetable = await db.timetable.create({
      data: {
        imageUrl: validatedData.imageUrl,
        targetCurriculum: validatedData.targetCurriculum || null,
        targetCurriculumType: validatedData.targetCurriculumType || null,
        targetGrade: validatedData.targetGrade || null,
        targetSection: validatedData.targetSection || null,
        courseId: validatedData.courseId,
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
