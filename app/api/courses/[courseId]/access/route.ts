import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkUserSubscription, courseMatchesSubscription } from "@/lib/subscription-utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const resolvedParams = await params;
  const { courseId } = resolvedParams;

  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    const course = await db.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
      },
      include: {
        purchases: {
          where: {
            userId,
          },
        },
      },
    });

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Free courses are always accessible
    if (course.isFree) {
      return NextResponse.json({ hasAccess: true });
    }

    // Check if user has any purchase with ACTIVE status
    const validPurchase = course.purchases.some(purchase => 
      purchase.status === "ACTIVE"
    );

    if (validPurchase) {
      return NextResponse.json({ hasAccess: true });
    }

    // Check if user has an active subscription that grants access to this course
    const subscriptionCheck = await checkUserSubscription(userId);
    if (subscriptionCheck.hasActiveSubscription && subscriptionCheck.subscription) {
      const hasSubscriptionAccess = courseMatchesSubscription(course, subscriptionCheck.subscription);
      if (hasSubscriptionAccess) {
        return NextResponse.json({ 
          hasAccess: true,
          subscriptionExpired: false 
        });
      }
    }

    // Check if user has an expired subscription that previously granted access to this course
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

    if (expiredSubscription && courseMatchesSubscription(course, expiredSubscription)) {
      // User had access via subscription but it expired
      return NextResponse.json({ 
        hasAccess: false,
        subscriptionExpired: true,
        subscriptionEndDate: expiredSubscription.endDate 
      });
    }

    return NextResponse.json({ 
      hasAccess: false,
      subscriptionExpired: false 
    });
  } catch (error) {
    console.error("[COURSE_ACCESS]", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
} 