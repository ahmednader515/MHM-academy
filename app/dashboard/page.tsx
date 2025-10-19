import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getDashboardUrlByRole } from "@/lib/utils";
import { Course, Purchase, Chapter } from "@prisma/client";
import { DashboardContent } from "./_components/dashboard-content";


type CourseWithProgress = Course & {
  chapters: { id: string }[];
  quizzes: { id: string }[];
  purchases: Purchase[];
  progress: number;
}

type LastWatchedChapter = {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  courseImageUrl: string | null;
  position: number;
}

type StudentStats = {
  totalCourses: number;
  totalChapters: number;
  completedChapters: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
}

const CoursesPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return redirect("/");
  }

  // Redirect non-students to their role-specific dashboard
  if (session.user.role !== "USER") {
    const dashboardUrl = getDashboardUrlByRole(session.user.role);
    return redirect(dashboardUrl);
  }


  // Calculate average score from quiz results (using best attempt for each quiz)
  const quizResults = await db.quizResult.findMany({
    where: {
      studentId: session.user.id
    },
    select: {
      quizId: true,
      percentage: true
    },
    orderBy: {
      percentage: 'desc' // Order by percentage descending to get best attempts first
    }
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
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      image: true,
      role: true,
      balance: true
    }
  });

  if (!user) {
    return redirect("/");
  }

  // Get last watched chapter
  const lastWatchedChapter = await db.userProgress.findFirst({
    where: {
      userId: session.user.id,
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
    }
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

  const courses = await db.course.findMany({
    where: {
      purchases: {
        some: {
          userId: session.user.id,
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
          userId: session.user.id,
        }
      }
    },
    orderBy: {
      createdAt: "desc",
    }
  });

  const coursesWithProgress = await Promise.all(
    courses.map(async (course) => {
      const totalChapters = course.chapters.length;
      const totalQuizzes = course.quizzes.length;
      const totalContent = totalChapters + totalQuizzes;

      const completedChapters = await db.userProgress.count({
        where: {
          userId: session.user.id,
          chapterId: {
            in: course.chapters.map(chapter => chapter.id)
          },
          isCompleted: true
        }
      });

      // Get unique completed quizzes by using findMany and counting the results
      const completedQuizResults = await db.quizResult.findMany({
        where: {
          studentId: session.user.id,
          quizId: {
            in: course.quizzes.map(quiz => quiz.id)
          }
        },
        select: {
          quizId: true
        }
      });

      // Count unique quizIds
      const uniqueQuizIds = new Set(completedQuizResults.map(result => result.quizId));
      const completedQuizzes = uniqueQuizIds.size;

      const completedContent = completedChapters + completedQuizzes;

      const progress = totalContent > 0 
        ? (completedContent / totalContent) * 100 
        : 0;

      return {
        ...course,
        progress
      } as CourseWithProgress;
    })
  );

  // Calculate overall student statistics
  const totalCourses = courses.length;
  const totalChapters = courses.reduce((sum, course) => sum + course.chapters.length, 0);
  const totalQuizzes = courses.reduce((sum, course) => sum + course.quizzes.length, 0);

  // Calculate total completed chapters across all courses
  const allChapterIds = courses.flatMap(course => course.chapters.map(chapter => chapter.id));
  const completedChapters = await db.userProgress.count({
    where: {
      userId: session.user.id,
      chapterId: {
        in: allChapterIds
      },
      isCompleted: true
    }
  });

  // Calculate total completed quizzes across all courses
  const allQuizIds = courses.flatMap(course => course.quizzes.map(quiz => quiz.id));
  const completedQuizResults = await db.quizResult.findMany({
    where: {
      studentId: session.user.id,
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

  const studentStats: StudentStats = {
    totalCourses,
    totalChapters,
    completedChapters,
    totalQuizzes,
    completedQuizzes,
    averageScore
  };

  return (
    <DashboardContent 
      user={user}
      lastWatchedChapter={lastWatchedChapterData}
      studentStats={studentStats}
      coursesWithProgress={coursesWithProgress}
    />
  );
}

export default CoursesPage; 