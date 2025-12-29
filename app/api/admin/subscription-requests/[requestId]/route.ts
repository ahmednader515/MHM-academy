import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { requestId } = await params;
    const { action } = await req.json(); // "approve" or "deny"

    if (!action || !["approve", "deny"].includes(action)) {
      return new NextResponse("Invalid action", { status: 400 });
    }

    const request = await (db as any).subscriptionRequest.findUnique({
      where: { id: requestId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!request) {
      return new NextResponse("Request not found", { status: 404 });
    }

    if (request.status !== "PENDING") {
      return new NextResponse("Request already processed", { status: 400 });
    }

    // Update request status
    await (db as any).subscriptionRequest.update({
      where: { id: requestId },
      data: {
        status: action === "approve" ? "APPROVED" : "DENIED",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    if (action === "approve") {
      // Calculate dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + request.subscription.plan.duration);

      // Update subscription to ACTIVE
      await (db as any).subscription.update({
        where: { id: request.subscription.id },
        data: {
          status: "ACTIVE",
          startDate,
          endDate,
        },
      });

      // Grant access to all courses matching the plan's criteria
      const courses = await (db as any).course.findMany({
        where: {
          isPublished: true,
          targetCurriculum: request.subscription.plan.curriculum,
          targetGrade: request.subscription.plan.grade,
          ...(request.subscription.plan.level && { targetLevel: request.subscription.plan.level }),
        },
      });

      // Create purchases for all matching courses
      for (const course of courses) {
        await (db as any).purchase.upsert({
          where: {
            userId_courseId: {
              userId: request.subscription.userId,
              courseId: course.id,
            },
          },
          create: {
            userId: request.subscription.userId,
            courseId: course.id,
            status: "ACTIVE",
          },
          update: {
            status: "ACTIVE",
          },
        });
      }
    } else {
      // Update subscription to DENIED
      await (db as any).subscription.update({
        where: { id: request.subscription.id },
        data: {
          status: "DENIED",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUBSCRIPTION_REQUEST_UPDATE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

