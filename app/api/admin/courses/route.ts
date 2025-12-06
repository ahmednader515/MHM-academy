import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId, user } = await auth();

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get courses created by this admin
    const courses = await db.course.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error("[ADMIN_COURSES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

