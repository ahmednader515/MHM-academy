import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        curriculum: true,
        level: true,
        language: true,
        grade: true,
        curriculumType: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Determine curriculum - use curriculumType if curriculum is null
    const curriculum = user.curriculum || (user.curriculumType === "egyptian" ? "egyptian" : null);

    if (!curriculum || !user.grade) {
      return NextResponse.json([]);
    }

    // Find plans matching the user's grade
    const plans = await (db as any).subscriptionPlan.findMany({
      where: {
        curriculum,
        grade: user.grade,
        isActive: true,
        ...(user.level && { level: user.level }),
        ...(user.language && { language: user.language }),
      },
      orderBy: { price: "asc" },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("[SUBSCRIPTION_PLANS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

