import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;
    const { courseId } = resolvedParams;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if course exists and is free
    const course = await db.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
        isFree: true
      }
    });

    if (!course) {
      return new NextResponse("Course not found or not free", { status: 404 });
    }

    // Check if user is already enrolled
    const existingPurchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    });

    if (existingPurchase) {
      return new NextResponse("Already enrolled in this course", { status: 400 });
    }

    // Create enrollment (purchase record for free course)
    const enrollment = await db.purchase.create({
      data: {
        userId,
        courseId,
        status: "ACTIVE"
      }
    });

    return NextResponse.json({ 
      message: "Successfully enrolled in free course",
      enrollment 
    });

  } catch (error) {
    console.log("[COURSE_ENROLLMENT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
