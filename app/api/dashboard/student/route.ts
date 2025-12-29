import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { grantAccessForUser, checkUserSubscription, courseMatchesSubscription } from "@/lib/subscription-utils";

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

    // Grant access to courses for active subscriptions (retroactive fix)
    await grantAccessForUser(userId);

    // Check user's subscription to include subscription-accessible courses
    const subscriptionCheck = await checkUserSubscription(userId);
    const hasActiveSubscription = subscriptionCheck.hasActiveSubscription;
    const activeSubscription = subscriptionCheck.subscription;

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

    // Build where clause for courses
    // Include courses with ANY purchases (ACTIVE or INACTIVE) OR courses accessible via subscription
    // This ensures courses from expired subscriptions still appear in overview
    const courseWhereClause: any = {
      OR: [
        {
          purchases: {
            some: {
              userId: userId,
            }
          }
        }
      ]
    };

    // If user has active subscription, also include courses matching subscription criteria
    if (hasActiveSubscription && activeSubscription) {
      const subscriptionWhere: any = {
        isPublished: true,
        targetCurriculum: activeSubscription.plan.curriculum,
        targetGrade: activeSubscription.plan.grade,
      };
      
      if (activeSubscription.plan.level) {
        subscriptionWhere.targetLevel = activeSubscription.plan.level;
      }

      courseWhereClause.OR.push(subscriptionWhere);
    }

    // Also include courses from expired subscriptions (so they remain visible)
    const expiredSubscription = await (db as any).subscription.findFirst({
      where: {
        userId,
        status: "EXPIRED",
      },
      include: {
        plan: true,
      },
      orderBy: {
        endDate: "desc",
      },
    });

    if (expiredSubscription) {
      const expiredSubscriptionWhere: any = {
        isPublished: true,
        targetCurriculum: expiredSubscription.plan.curriculum,
        targetGrade: expiredSubscription.plan.grade,
      };
      
      if (expiredSubscription.plan.level) {
        expiredSubscriptionWhere.targetLevel = expiredSubscription.plan.level;
      }

      courseWhereClause.OR.push(expiredSubscriptionWhere);
    }

    // Get courses
    const courses = await db.course.findMany({
      where: courseWhereClause,
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

    // Filter courses to include those the user has access to OR had access to
    // (either via purchase or subscription - including expired subscriptions)
    // This ensures courses remain visible in overview even if subscription expired
    const accessibleCourses = courses.filter(course => {
      // Free courses are always accessible
      if (course.isFree) return true;
      
      // Check if user has any purchase (ACTIVE or INACTIVE - from expired subscription)
      // This ensures courses from expired subscriptions still show in overview
      const hasAnyPurchase = course.purchases.length > 0;
      if (hasAnyPurchase) return true;
      
      // Check if course matches active subscription
      if (hasActiveSubscription && activeSubscription) {
        return courseMatchesSubscription(course, activeSubscription);
      }
      
      return false;
    });

    // Batch all queries to avoid N+1 problem - run in parallel
    const allChapterIds = accessibleCourses.flatMap(course => course.chapters.map(chapter => chapter.id));
    const allQuizIds = accessibleCourses.flatMap(course => course.quizzes.map(quiz => quiz.id));

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
    const coursesWithProgress = accessibleCourses.map((course) => {
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
    const totalCourses = accessibleCourses.length;
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

