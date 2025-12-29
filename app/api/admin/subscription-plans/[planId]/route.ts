import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { planId } = await params;
    const { price, duration, description, isActive } = await req.json();

    const plan = await (db as any).subscriptionPlan.update({
      where: { id: planId },
      data: {
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(duration !== undefined && { duration: parseInt(duration) }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("[SUBSCRIPTION_PLAN_UPDATE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { planId } = await params;

    await (db as any).subscriptionPlan.delete({
      where: { id: planId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUBSCRIPTION_PLAN_DELETE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

