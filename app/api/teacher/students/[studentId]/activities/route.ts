import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get all activity submissions for a specific student (teacher view)
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

    // Get all activity submissions for this student
    let whereClause: any;
    if (user.role === "TEACHER" && teacherCourseIds.length > 0) {
      whereClause = {
        studentId: resolvedParams.studentId,
        activity: {
          chapter: {
            courseId: {
              in: teacherCourseIds
            }
          }
        }
      };
    } else if (user.role === "TEACHER" && teacherCourseIds.length === 0) {
      // Teacher with no courses should see no activities
      whereClause = {
        studentId: resolvedParams.studentId,
        activity: {
          chapter: {
            courseId: {
              in: [] // Empty array means no results
            }
          }
        }
      };
    } else {
      // Admin sees all
      whereClause = {
        studentId: resolvedParams.studentId
      };
    }

    const activitySubmissions = await db.activitySubmission.findMany({
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
        activity: {
          select: {
            id: true,
            title: true,
            description: true,
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
        createdAt: "desc"
      },
    });

    return NextResponse.json(activitySubmissions);
  } catch (error) {
    console.error("[TEACHER_STUDENT_ACTIVITIES_GET]", error);
    console.error("[TEACHER_STUDENT_ACTIVITIES_GET] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

