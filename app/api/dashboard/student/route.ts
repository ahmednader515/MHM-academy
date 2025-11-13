import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId, user } = await auth();

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Only for students
    if (user.role !== "USER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Calculate average score from quiz results (using best attempt for each quiz)
    const quizResults = await db.quizResult.findMany({
      where: {
        studentId: userId
      },
      select: {
        quizId: true,
        percentage: true
      },
      orderBy: {
        percentage: 'desc'
      },
    });

    // Get only the best attempt for each quiz
    const bestAttempts = new Map();
    quizResults.forEach(result => {
      if (!bestAttempts.has(result.quizId)) {
        bestAttempts.set(result.quizId, result.percentage);
      }
    });

    const averageScore = bestAttempts.size > 0 
      ? Math.round(Array.from(bestAttempts.values()).reduce((sum, percentage) => sum + percentage, 0) / bestAttempts.size)
      : 0;

    // Get user data
    const userData = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        image: true,
        role: true,
        balance: true,
        points: true
      },
    });

    // Get last watched chapter
    const lastWatchedChapter = await db.userProgress.findFirst({
      where: {
        userId: userId,
        isCompleted: false
      },
      include: {
        chapter: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                imageUrl: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
    });

    const lastWatchedChapterData = lastWatchedChapter ? {
      id: lastWatchedChapter.chapter.id,
      title: lastWatchedChapter.chapter.title,
      courseId: lastWatchedChapter.chapter.courseId,
      position: lastWatchedChapter.chapter.position,
      chapter: {
        id: lastWatchedChapter.chapter.id,
        title: lastWatchedChapter.chapter.title,
        position: lastWatchedChapter.chapter.position,
        course: {
          title: lastWatchedChapter.chapter.course.title,
          imageUrl: lastWatchedChapter.chapter.course.imageUrl
        }
      }
    } : null;

    // Get courses
    const courses = await db.course.findMany({
      where: {
        purchases: {
          some: {
            userId: userId,
            status: "ACTIVE"
          }
        }
      },
      include: {
        chapters: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
        quizzes: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
        purchases: {
          where: {
            userId: userId,
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate progress for each course
    const coursesWithProgress = await Promise.all(
      courses.map(async (course) => {
        const totalChapters = course.chapters.length;
        const totalQuizzes = course.quizzes.length;
        const totalContent = totalChapters + totalQuizzes;

        const completedChapters = await db.userProgress.count({
          where: {
            userId: userId,
            chapterId: {
              in: course.chapters.map(chapter => chapter.id)
            },
            isCompleted: true
          }
        });

        const completedQuizResults = await db.quizResult.findMany({
          where: {
            studentId: userId,
            quizId: {
              in: course.quizzes.map(quiz => quiz.id)
            }
          },
          select: {
            quizId: true
          }
        });

        const uniqueQuizIds = new Set(completedQuizResults.map(result => result.quizId));
        const completedQuizzes = uniqueQuizIds.size;

        const completedContent = completedChapters + completedQuizzes;

        const progress = totalContent > 0 
          ? (completedContent / totalContent) * 100 
          : 0;

        return {
          ...course,
          progress
        };
      })
    );

    // Calculate overall statistics
    const totalCourses = courses.length;
    const totalChapters = courses.reduce((sum, course) => sum + course.chapters.length, 0);
    const totalQuizzes = courses.reduce((sum, course) => sum + course.quizzes.length, 0);

    const allChapterIds = courses.flatMap(course => course.chapters.map(chapter => chapter.id));
    const completedChapters = await db.userProgress.count({
      where: {
        userId: userId,
        chapterId: {
          in: allChapterIds
        },
        isCompleted: true
      }
    });

    const allQuizIds = courses.flatMap(course => course.quizzes.map(quiz => quiz.id));
    const completedQuizResults = await db.quizResult.findMany({
      where: {
        studentId: userId,
        quizId: {
          in: allQuizIds
        }
      },
      select: {
        quizId: true
      }
    });
    const uniqueCompletedQuizIds = new Set(completedQuizResults.map(result => result.quizId));
    const completedQuizzes = uniqueCompletedQuizIds.size;

    const studentStats = {
      totalCourses,
      totalChapters,
      completedChapters,
      totalQuizzes,
      completedQuizzes,
      averageScore
    };

    return NextResponse.json({
      user: userData,
      lastWatchedChapter: lastWatchedChapterData,
      studentStats,
      coursesWithProgress
    });

  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

