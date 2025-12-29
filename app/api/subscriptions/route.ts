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

    const { planId } = await req.json();

    if (!planId) {
      return new NextResponse("Missing plan ID", { status: 400 });
    }

    // Check if plan exists and is active
    const plan = await (db as any).subscriptionPlan.findUnique({
      where: { id: planId },
    }) as any;

    if (!plan || !plan.isActive) {
      return new NextResponse("Plan not found or inactive", { status: 404 });
    }

    // Get user with balance
    const user = await (db as any).user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Check if user has sufficient balance
    if (user.balance < plan.price) {
      return NextResponse.json(
        { error: "INSUFFICIENT_BALANCE", message: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription for this plan
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

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    // Create subscription, deduct balance, and grant access in a transaction
    const result = await (db as any).$transaction(async (tx: any) => {
      // Create subscription with ACTIVE status
      const subscription = await tx.subscription.create({
        data: {
          userId: session.user.id,
          planId,
          status: "ACTIVE",
          startDate,
          endDate,
        },
        include: {
          plan: true,
        },
      });

      // Update user balance
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          balance: {
            decrement: plan.price,
          },
        },
      });

      // Create balance transaction record
      await tx.balanceTransaction.create({
        data: {
          userId: session.user.id,
          amount: -plan.price,
          type: "PURCHASE",
          description: `اشتراك شهري: ${plan.curriculum} - ${plan.grade}`,
        },
      });

      return { subscription, updatedUser };
    }) as { subscription: any; updatedUser: any };

    // Grant access to all matching courses (outside transaction)
    await grantAccessForUser(session.user.id);

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      newBalance: result.updatedUser.balance,
    });
  } catch (error) {
    console.error("[SUBSCRIPTIONS_POST_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

