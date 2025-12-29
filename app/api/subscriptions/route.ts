import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkUserSubscription, grantAccessForUser } from "@/lib/subscription-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check and update expired subscriptions
    await checkUserSubscription(session.user.id);

    // Grant access to courses for active subscriptions (retroactive fix)
    await grantAccessForUser(session.user.id);

    const subscriptions = await (db as any).subscription.findMany({
      where: { userId: session.user.id },
      include: {
        plan: true,
        request: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error("[SUBSCRIPTIONS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "USER") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { planId, transactionImage } = await req.json();

    if (!planId || !transactionImage) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Check if plan exists and is active
    const plan = await (db as any).subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return new NextResponse("Plan not found or inactive", { status: 404 });
    }

    // Check if user already has an active or pending subscription for this plan
    // Allow renewal if subscription is expired
    const existingSubscription = await (db as any).subscription.findFirst({
      where: {
        userId: session.user.id,
        planId,
        status: {
          in: ["PENDING", "APPROVED", "ACTIVE"],
        },
      },
    });

    if (existingSubscription) {
      return new NextResponse("You already have an active or pending subscription for this plan", { status: 400 });
    }

    // Create subscription and request
    const subscription = await (db as any).subscription.create({
      data: {
        userId: session.user.id,
        planId,
        status: "PENDING",
        request: {
          create: {
            transactionImage,
            status: "PENDING",
          },
        },
      },
      include: {
        plan: true,
        request: true,
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("[SUBSCRIPTIONS_POST_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

