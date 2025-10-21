import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId, user } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const liveStreams = await db.liveStream.findMany({
      include: {
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(liveStreams);
  } catch (e) {
    console.error("[ADMIN_LIVESTREAMS]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, user } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, description, zoomUrl, courseId, scheduledAt, duration } = await req.json();

    if (!title || !zoomUrl || !courseId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate course exists
    const course = await db.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const liveStream = await db.liveStream.create({
      data: {
        title,
        description,
        zoomUrl,
        zoomMeetingId: "", // Will be extracted and updated
        courseId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        duration: duration ? parseInt(duration) : null,
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(liveStream);
  } catch (e) {
    console.error("[ADMIN_LIVESTREAMS_CREATE]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
