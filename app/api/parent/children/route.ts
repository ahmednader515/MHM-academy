import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Get the current user to verify they are a parent
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, phoneNumber: true },
      cacheStrategy: { ttl: 300 } // Cache user data for 5 minutes
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
        curriculumType: true,
        level: true,
        grade: true,
        points: true,
        purchases: {
          where: {
            status: "ACTIVE"
          },
          select: {
            course: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
                chapters: {
                  where: {
                    isPublished: true
                  },
                  select: {
                    id: true,
                    title: true,
                    position: true
                  },
                  orderBy: {
                    position: 'asc'
                  }
                },
                quizzes: {
                  where: {
                    isPublished: true
                  },
                  select: {
                    id: true,
                    title: true,
                    position: true
                  },
                  orderBy: {
                    position: 'asc'
                  }
                }
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
            quizId: true,
            score: true,
            totalPoints: true,
            percentage: true,
            attemptNumber: true,
            submittedAt: true,
            createdAt: true,
            quiz: {
              select: {
                id: true,
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
          take: 10
        }
      },
      cacheStrategy: { ttl: 180 } // Cache children data for 3 minutes
    });

    // Transform the data for the parent dashboard
    const childrenData = children.map(child => {
      // Get purchased courses
      const purchasedCourses = child.purchases.map(purchase => purchase.course);
      const coursesCount = purchasedCourses.length;
      
      // Calculate total chapters from purchased courses only
      const totalChapters = purchasedCourses.reduce((total, course) => 
        total + course.chapters.length, 0
      );
      
      // Calculate completed chapters from purchased courses only
      const purchasedCourseIds = purchasedCourses.map(course => course.id);
      const completedChapters = child.userProgress.filter(progress => 
        progress.isCompleted && 
        purchasedCourseIds.includes(progress.chapter.course.id)
      ).length;

      // Calculate quiz statistics
      const totalQuizzes = purchasedCourses.reduce((total, course) => 
        total + course.quizzes.length, 0
      );
      
      // Get quiz results for purchased courses only
      const purchasedQuizIds = purchasedCourses.flatMap(course => 
        course.quizzes.map(quiz => quiz.id)
      );
      const relevantQuizResults = child.quizResults.filter(result => 
        result.quizId && purchasedQuizIds.includes(result.quizId)
      );

      // Calculate average score from best attempts
      const bestAttempts = new Map();
      relevantQuizResults.forEach(result => {
        if (!bestAttempts.has(result.quizId) || 
            result.percentage > bestAttempts.get(result.quizId)) {
          bestAttempts.set(result.quizId, result.percentage);
        }
      });
      
      const averageScore = bestAttempts.size > 0 
        ? Math.round(Array.from(bestAttempts.values()).reduce((sum, percentage) => sum + percentage, 0) / bestAttempts.size)
        : 0;

      // Calculate completed quizzes
      const completedQuizzes = bestAttempts.size;

      return {
        id: child.id,
        fullName: child.fullName,
        phoneNumber: child.phoneNumber,
        email: child.email,
        curriculum: child.curriculum,
        curriculumType: child.curriculumType,
        level: child.level,
        grade: child.grade,
        points: child.points || 0,
        coursesCount,
        completedChapters,
        totalChapters,
        totalQuizzes,
        completedQuizzes,
        averageScore,
        courses: purchasedCourses,
        userProgress: child.userProgress,
        recentQuizResults: relevantQuizResults.slice(0, 5)
      };
    });

    return NextResponse.json(childrenData);
  } catch (error) {
    console.error("[PARENT_CHILDREN_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
