import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; livestreamId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;
    const { courseId, livestreamId } = resolvedParams;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user has access to the course
    const course = await db.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
      },
      include: {
        purchases: {
          where: {
            userId,
            status: "ACTIVE"
          }
        }
      }
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    // Check if user has access (course is free or user has purchased it)
    const hasAccess = course.isFree || course.purchases.length > 0;
    
    if (!hasAccess) {
      return new NextResponse("Access denied", { status: 403 });
    }

    // Get the live stream
    const liveStream = await db.liveStream.findUnique({
      where: {
        id: livestreamId,
        courseId: courseId,
        isPublished: true
      }
    });

    if (!liveStream) {
      return new NextResponse("Live stream not found", { status: 404 });
    }

    return NextResponse.json(liveStream);
  } catch (error) {
    console.error("[COURSE_LIVESTREAM_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
