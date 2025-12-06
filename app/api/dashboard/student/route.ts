import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user;

    // Only for students
    if (user.role !== "USER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Run initial queries in parallel for better performance
    const [quizResults, userData, lastWatchedChapter] = await Promise.all([
      // Calculate average score from quiz results (using best attempt for each quiz)
      db.quizResult.findMany({
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
      }),
      // Get user data
      db.user.findUnique({
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
      }),
      // Get last watched chapter
      db.userProgress.findFirst({
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
      })
    ]);

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

    // Batch all queries to avoid N+1 problem - run in parallel
    const allChapterIds = courses.flatMap(course => course.chapters.map(chapter => chapter.id));
    const allQuizIds = courses.flatMap(course => course.quizzes.map(quiz => quiz.id));

    // Run progress queries in parallel
    const [allCompletedChapters, allCompletedQuizResults] = await Promise.all([
      db.userProgress.findMany({
        where: {
          userId: userId,
          chapterId: {
            in: allChapterIds
          },
          isCompleted: true
        },
        select: {
          chapterId: true
        },
      }),
      db.quizResult.findMany({
        where: {
          studentId: userId,
          quizId: {
            in: allQuizIds
          }
        },
        select: {
          quizId: true
        },
      })
    ]);

    // Create maps for O(1) lookup
    const completedChapterIds = new Set(allCompletedChapters.map(progress => progress.chapterId));
    const completedQuizIds = new Set(allCompletedQuizResults.map(result => result.quizId));

    // Calculate progress for each course using the batched data
    const coursesWithProgress = courses.map((course) => {
      const totalChapters = course.chapters.length;
      const totalQuizzes = course.quizzes.length;
      const totalContent = totalChapters + totalQuizzes;

      const completedChapters = course.chapters.filter(chapter => 
        completedChapterIds.has(chapter.id)
      ).length;

      const completedQuizzes = course.quizzes.filter(quiz => 
        completedQuizIds.has(quiz.id)
      ).length;

      const completedContent = completedChapters + completedQuizzes;

      const progress = totalContent > 0 
        ? (completedContent / totalContent) * 100 
        : 0;

      return {
        ...course,
        progress
      };
    });

    // Calculate overall statistics
    const totalCourses = courses.length;
    const totalChapters = courses.reduce((sum, course) => sum + course.chapters.length, 0);
    const totalQuizzes = courses.reduce((sum, course) => sum + course.quizzes.length, 0);

    // Use the already fetched data instead of querying again
    const completedChapters = completedChapterIds.size;
    const completedQuizzes = completedQuizIds.size;

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

