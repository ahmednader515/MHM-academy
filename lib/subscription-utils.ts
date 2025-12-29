import { db } from "@/lib/db";

/**
 * Check and update expired subscriptions
 * Returns true if user has an active subscription
 */
export async function checkUserSubscription(userId: string): Promise<{
  hasActiveSubscription: boolean;
  subscription: any | null;
}> {
  // Find active subscriptions
  const activeSubscriptions = await (db as any).subscription.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      plan: true,
    },
  });

  const now = new Date();
  let hasActive = false;
  let activeSubscription = null;

  // Check each subscription for expiration
  for (const subscription of activeSubscriptions) {
    if (subscription.endDate && new Date(subscription.endDate) < now) {
      // Subscription expired - update status and revoke access
      await (db as any).subscription.update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" },
      });

      // Revoke access to all courses that were granted by this subscription
      const plan = subscription.plan;
      const courses = await (db as any).course.findMany({
        where: {
          isPublished: true,
          targetCurriculum: plan.curriculum,
          targetGrade: plan.grade,
          ...(plan.level && { targetLevel: plan.level }),
        },
      });

      // Remove purchases for these courses that were granted by subscription
      for (const course of courses) {
        await (db as any).purchase.updateMany({
          where: {
            userId,
            courseId: course.id,
            status: "ACTIVE",
          },
          data: {
            status: "INACTIVE",
          },
        });
      }
    } else {
      // Subscription is still active
      hasActive = true;
      activeSubscription = subscription;
    }
  }

  return {
    hasActiveSubscription: hasActive,
    subscription: activeSubscription,
  };
}

/**
 * Check if a course matches a subscription plan
 */
export function courseMatchesSubscription(course: any, subscription: any): boolean {
  if (!subscription || !subscription.plan) return false;

  const plan = subscription.plan;
  
  return (
    course.targetCurriculum === plan.curriculum &&
    course.targetGrade === plan.grade &&
    (!plan.level || course.targetLevel === plan.level)
  );
}

/**
 * Check if user has access to a course via subscription
 */
export async function hasSubscriptionAccess(userId: string, course: any): Promise<boolean> {
  const subscriptionCheck = await checkUserSubscription(userId);
  if (subscriptionCheck.hasActiveSubscription && subscriptionCheck.subscription) {
    return courseMatchesSubscription(course, subscriptionCheck.subscription);
  }
  return false;
}

/**
 * Grant course access to all active subscriptions that match the course criteria
 * This should be called when a course is published or its target fields are updated
 */
export async function grantCourseAccessToSubscriptions(courseId: string, course: any): Promise<void> {
  // Only process if course is published and has target fields
  if (!course.isPublished || !course.targetCurriculum || !course.targetGrade) {
    return;
  }

  // Find all active subscriptions with matching curriculum and grade
  // We'll filter by level/language in code since plans can have null level/language (meaning "all")
  const matchingSubscriptions = await (db as any).subscription.findMany({
    where: {
      status: "ACTIVE",
      plan: {
        curriculum: course.targetCurriculum,
        grade: course.targetGrade,
      },
    },
    include: {
      plan: true,
    },
  });

  // Grant access to all matching subscriptions
  for (const subscription of matchingSubscriptions) {
    // Check if course matches subscription (handles null level)
    // If plan.level is null, it matches all levels. Language is not used in matching.
    const matches = 
      subscription.plan.curriculum === course.targetCurriculum &&
      subscription.plan.grade === course.targetGrade &&
      (!subscription.plan.level || !course.targetLevel || course.targetLevel === subscription.plan.level);

    if (matches) {
      // Create or update purchase to grant access
      await (db as any).purchase.upsert({
        where: {
          userId_courseId: {
            userId: subscription.userId,
            courseId: courseId,
          },
        },
        create: {
          userId: subscription.userId,
          courseId: courseId,
          status: "ACTIVE",
        },
        update: {
          status: "ACTIVE",
        },
      });
    }
  }
}

/**
 * Grant course access for a specific user's active subscriptions
 * This ensures the user has access to all courses matching their subscription plans
 */
export async function grantAccessForUser(userId: string): Promise<number> {
  let coursesGranted = 0;

  // Find all active subscriptions for this user
  const activeSubscriptions = await (db as any).subscription.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      plan: true,
    },
  });

  for (const subscription of activeSubscriptions) {
    // Find all published courses matching this subscription's plan
    const matchingCourses = await (db as any).course.findMany({
      where: {
        isPublished: true,
        targetCurriculum: subscription.plan.curriculum,
        targetGrade: subscription.plan.grade,
        ...(subscription.plan.level && { targetLevel: subscription.plan.level }),
      },
    });

    // Grant access to all matching courses
    for (const course of matchingCourses) {
      // Check if course matches subscription (handles null level)
      const matches = 
        subscription.plan.curriculum === course.targetCurriculum &&
        subscription.plan.grade === course.targetGrade &&
        (!subscription.plan.level || !course.targetLevel || course.targetLevel === subscription.plan.level);

      if (matches) {
        // Check if purchase already exists
        const existingPurchase = await (db as any).purchase.findUnique({
          where: {
            userId_courseId: {
              userId: subscription.userId,
              courseId: course.id,
            },
          },
        });

        if (!existingPurchase || existingPurchase.status !== "ACTIVE") {
          // Create or update purchase to grant access
          await (db as any).purchase.upsert({
            where: {
              userId_courseId: {
                userId: subscription.userId,
                courseId: course.id,
              },
            },
            create: {
              userId: subscription.userId,
              courseId: course.id,
              status: "ACTIVE",
            },
            update: {
              status: "ACTIVE",
            },
          });
          coursesGranted++;
        }
      }
    }
  }

  return coursesGranted;
}

/**
 * Retroactively grant course access to all active subscriptions
 * This should be called to fix subscriptions that were approved before the auto-grant logic was added
 */
export async function grantAccessToAllActiveSubscriptions(): Promise<{
  subscriptionsProcessed: number;
  coursesGranted: number;
}> {
  let subscriptionsProcessed = 0;
  let totalCoursesGranted = 0;

  // Find all active subscriptions
  const activeSubscriptions = await (db as any).subscription.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      plan: true,
    },
  });

  for (const subscription of activeSubscriptions) {
    subscriptionsProcessed++;
    const coursesGranted = await grantAccessForUser(subscription.userId);
    totalCoursesGranted += coursesGranted;
  }

  return {
    subscriptionsProcessed,
    coursesGranted: totalCoursesGranted,
  };
}

