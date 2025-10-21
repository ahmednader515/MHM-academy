import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the current user to verify they are a parent
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, phoneNumber: true }
    });

    if (!currentUser || currentUser.role !== "PARENT") {
      return new NextResponse("Access denied. Parent role required.", { status: 403 });
    }

    // Find all children linked to this parent's phone number
    const children = await db.user.findMany({
      where: {
        parentPhoneNumber: currentUser.phoneNumber,
        role: "USER"
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        curriculum: true,
        level: true,
        grade: true,
        points: true,
        courses: {
          select: {
            id: true,
            title: true,
            chapters: {
              select: {
                id: true,
                isPublished: true
              }
            }
          }
        },
        userProgress: {
          select: {
            isCompleted: true,
            chapter: {
              select: {
                id: true,
                course: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        },
        quizResults: {
          select: {
            id: true,
            score: true,
            totalPoints: true,
            percentage: true,
            attemptNumber: true,
            submittedAt: true,
            createdAt: true,
            quiz: {
              select: {
                title: true,
                course: {
                  select: {
                    title: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });

    // Transform the data for the parent dashboard
    const childrenData = children.map(child => {
      const coursesCount = child.courses.length;
      const totalChapters = child.courses.reduce((total, course) => 
        total + course.chapters.filter(chapter => chapter.isPublished).length, 0
      );
      const completedChapters = child.userProgress.filter(progress => progress.isCompleted).length;

      return {
        id: child.id,
        fullName: child.fullName,
        phoneNumber: child.phoneNumber,
        email: child.email,
        curriculum: child.curriculum,
        level: child.level,
        grade: child.grade,
        points: child.points || 0,
        coursesCount,
        completedChapters,
        totalChapters,
        recentQuizResults: child.quizResults
      };
    });

    return NextResponse.json(childrenData);
  } catch (error) {
    console.error("[PARENT_CHILDREN_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
