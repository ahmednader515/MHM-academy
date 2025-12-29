import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const curriculum = searchParams.get("curriculum");
    const level = searchParams.get("level");
    const language = searchParams.get("language");
    const grade = searchParams.get("grade");
    const status = searchParams.get("status");

    const where: any = {
      subscription: {
        plan: {},
      },
    };

    if (curriculum) {
      where.subscription.plan.curriculum = curriculum;
    }

    if (level) {
      where.subscription.plan.level = level;
    }

    if (language) {
      where.subscription.plan.language = language;
    }

    if (grade) {
      where.subscription.plan.grade = grade;
    }

    if (status) {
      where.status = status;
    }

    const requests = await (db as any).subscriptionRequest.findMany({
      where,
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
                curriculum: true,
                level: true,
                language: true,
                grade: true,
              },
            },
            plan: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[SUBSCRIPTION_REQUESTS_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

