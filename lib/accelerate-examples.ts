// Prisma Accelerate Extension Examples
// This file demonstrates how to use the Accelerate extension with caching strategies

import { db } from './db';

// Example 1: Basic caching with TTL
export async function getCachedUser(userId: string) {
  return await db.user.findUnique({
    where: { id: userId },
    cacheStrategy: { ttl: 60 }, // Cache for 1 minute
  });
}

// Example 2: Caching with different TTL values based on data type
export async function getCachedCourses() {
  return await db.course.findMany({
    where: { isPublished: true },
    include: {
      user: true,
      chapters: {
        where: { isPublished: true },
        select: { id: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    cacheStrategy: { ttl: 300 }, // Cache for 5 minutes (courses don't change often)
  });
}

// Example 3: Caching user progress (shorter TTL as it changes frequently)
export async function getCachedUserProgress(userId: string, courseId: string) {
  return await db.userProgress.findMany({
    where: {
      userId,
      chapter: {
        courseId
      }
    },
    include: {
      chapter: {
        select: {
          id: true,
          title: true,
          position: true
        }
      }
    },
    cacheStrategy: { ttl: 30 }, // Cache for 30 seconds (progress changes frequently)
  });
}

// Example 4: Caching quiz results (medium TTL)
export async function getCachedQuizResults(studentId: string) {
  return await db.quizResult.findMany({
    where: { studentId },
    include: {
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
    orderBy: { submittedAt: 'desc' },
    cacheStrategy: { ttl: 120 }, // Cache for 2 minutes
  });
}

// Example 5: Caching with complex queries
export async function getCachedDashboardData(userId: string) {
  const [user, courses, lastWatchedChapter] = await Promise.all([
    // User data - cache for 1 minute
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        balance: true,
        points: true
      },
      cacheStrategy: { ttl: 60 }
    }),
    
    // User's purchased courses - cache for 5 minutes
    db.course.findMany({
      where: {
        purchases: {
          some: {
            userId,
            status: "ACTIVE"
          }
        }
      },
      include: {
        chapters: {
          where: { isPublished: true },
          select: { id: true }
        },
        quizzes: {
          where: { isPublished: true },
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      cacheStrategy: { ttl: 300 }
    }),
    
    // Last watched chapter - cache for 1 minute
    db.userProgress.findFirst({
      where: {
        userId,
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
      orderBy: { updatedAt: 'desc' },
      cacheStrategy: { ttl: 60 }
    })
  ]);

  return { user, courses, lastWatchedChapter };
}

// Example 6: Caching with different strategies based on query type
export class CachedQueries {
  // Static data - long cache
  static async getCurriculums() {
    return await db.user.findMany({
      select: { curriculum: true },
      distinct: ['curriculum'],
      where: { curriculum: { not: null } },
      cacheStrategy: { ttl: 3600 } // Cache for 1 hour
    });
  }

  // User-specific data - medium cache
  static async getUserCourses(userId: string) {
    return await db.course.findMany({
      where: {
        purchases: {
          some: { userId, status: "ACTIVE" }
        }
      },
      include: {
        chapters: { select: { id: true } },
        quizzes: { select: { id: true } }
      },
      cacheStrategy: { ttl: 300 } // Cache for 5 minutes
    });
  }

  // Frequently changing data - short cache
  static async getUserProgress(userId: string) {
    return await db.userProgress.findMany({
      where: { userId },
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            course: {
              select: { title: true }
            }
          }
        }
      },
      cacheStrategy: { ttl: 30 } // Cache for 30 seconds
    });
  }
}

// Example 7: Conditional caching based on environment
export async function getCachedData(query: any, ttl: number = 60) {
  const cacheStrategy = process.env.NODE_ENV === 'production' 
    ? { ttl } 
    : undefined; // No caching in development

  return await db.user.findMany({
    ...query,
    cacheStrategy
  });
}
