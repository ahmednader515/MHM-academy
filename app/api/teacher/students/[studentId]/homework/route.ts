import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get all homework submissions for a specific student (teacher view)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is teacher or admin
    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get teacher's course IDs if teacher
    let teacherCourseIds: string[] = [];
    if (user.role === "TEACHER") {
      const teacherOwnedCourses = await db.course.findMany({
        where: {
          userId: userId
        },
        select: {
          id: true
        }
      });
      teacherCourseIds = teacherOwnedCourses.map(c => c.id);
    }

    // Get all homework submissions for this student
    const whereClause = user.role === "TEACHER" && teacherCourseIds.length > 0
      ? {
          studentId: resolvedParams.studentId,
          chapter: {
            courseId: {
              in: teacherCourseIds
            }
          }
        }
      : {
          studentId: resolvedParams.studentId
        };

    const homeworkSubmissions = await db.homeworkSubmission.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
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
      orderBy: [
        {
          chapter: {
            course: {
              title: "asc"
            }
          }
        },
        {
          chapter: {
            position: "asc"
          }
        },
        {
          createdAt: "desc"
        }
      ],
    });

    return NextResponse.json(homeworkSubmissions);
  } catch (error) {
    console.log("[TEACHER_STUDENT_HOMEWORK_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

