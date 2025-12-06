import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        const { title, isFree } = await req.json();

        if(!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.create({
            data: {
                userId,
                title,
                isFree: isFree || false,
            }
        });

        return NextResponse.json(course);

    } catch (error) {
        console.log("[Courses]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeProgress = searchParams.get('includeProgress') === 'true';
    
    // Try to get user, but don't fail if not authenticated
    let userId = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (error) {
      // User is not authenticated, which is fine for the home page
      console.log("User not authenticated, showing courses without progress");
    }

    const courses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            image: true
          }
        },
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
        purchases: includeProgress && userId ? {
          where: {
            userId: userId,
            status: "ACTIVE"
          }
        } : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (includeProgress && userId) {
      // Batch all queries to avoid N+1 problem - run in parallel
      const allChapterIds = courses.flatMap(course => course.chapters.map(chapter => chapter.id));
      const allQuizIds = courses.flatMap(course => course.quizzes.map(quiz => quiz.id));

      // Run progress queries in parallel
      const [allCompletedChapters, allCompletedQuizResults] = await Promise.all([
        db.userProgress.findMany({
          where: {
            userId,
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

        let completedChapters = 0;
        let completedQuizzes = 0;

        if (course.purchases && course.purchases.length > 0) {
          completedChapters = course.chapters.filter(chapter => 
            completedChapterIds.has(chapter.id)
          ).length;

          completedQuizzes = course.quizzes.filter(quiz => 
            completedQuizIds.has(quiz.id)
          ).length;
        }

        const completedContent = completedChapters + completedQuizzes;
        const progress = totalContent > 0 ? (completedContent / totalContent) * 100 : 0;

        return {
          ...course,
          progress
        };
      });

      return NextResponse.json(coursesWithProgress);
    }

    // For unauthenticated users, return courses without progress
    const coursesWithoutProgress = courses.map(course => ({
      ...course,
      progress: 0
    }));

    return NextResponse.json(coursesWithoutProgress);
  } catch (error) {
    console.log("[COURSES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}