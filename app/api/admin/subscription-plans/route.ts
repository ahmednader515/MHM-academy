import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const plans = await (db as any).subscriptionPlan.findMany({
      orderBy: [
        { curriculum: "asc" },
        { grade: "asc" },
      ],
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("[SUBSCRIPTION_PLANS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { curriculum, level, language, grade, price, duration, description, isActive } = await req.json();

    if (!curriculum || !grade || !price) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Check if plan already exists for this grade combination
    const existingPlan = await (db as any).subscriptionPlan.findFirst({
      where: {
        curriculum,
        level: level || null,
        language: language || null,
        grade,
      },
    });

    if (existingPlan) {
      return new NextResponse("Plan already exists for this grade", { status: 400 });
    }

    const plan = await (db as any).subscriptionPlan.create({
      data: {
        curriculum,
        level: level || null,
        language: language || null,
        grade,
        price: parseFloat(price),
        duration: duration ? parseInt(duration) : 30,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error("[SUBSCRIPTION_PLANS_POST_ERROR]", error);
    if (error.code === "P2002") {
      return new NextResponse("Plan already exists for this grade", { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

