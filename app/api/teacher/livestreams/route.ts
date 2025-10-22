import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { detectMeetingType, extractMeetingId, isValidMeetingUrl } from "@/lib/zoom";

export async function GET() {
  try {
    const { userId, user } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user?.role !== "TEACHER") return NextResponse.json({ error: "Forbidden - Only teachers can access this resource" }, { status: 403 });

    // Teachers can only see live streams for their own courses
    const liveStreams = await db.liveStream.findMany({
      where: {
        course: {
          userId: userId
        }
      },
      include: {
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(liveStreams);
  } catch (e) {
    console.error("[TEACHER_LIVESTREAMS]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, user } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user?.role !== "TEACHER") return NextResponse.json({ error: "Forbidden - Only teachers can access this resource" }, { status: 403 });

    const { title, description, meetingUrl, courseId, scheduledAt, duration } = await req.json();

    if (!title || !meetingUrl || !courseId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate meeting URL
    if (!isValidMeetingUrl(meetingUrl)) {
      return NextResponse.json({ error: "Invalid meeting URL. Please provide a valid Zoom or Google Meet URL." }, { status: 400 });
    }

    // Detect meeting type and extract meeting ID
    const meetingType = detectMeetingType(meetingUrl);
    if (!meetingType) {
      return NextResponse.json({ error: "Could not detect meeting type" }, { status: 400 });
    }

    const meetingId = extractMeetingId(meetingUrl, meetingType);
    if (!meetingId) {
      return NextResponse.json({ error: "Could not extract meeting ID" }, { status: 400 });
    }

    // Validate course exists and belongs to the teacher
    const course = await db.course.findFirst({
      where: { 
        id: courseId,
        userId: userId
      }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found or access denied" }, { status: 404 });
    }

    const liveStream = await db.liveStream.create({
      data: {
        title,
        description,
        meetingUrl,
        meetingId,
        meetingType,
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
    console.error("[TEACHER_LIVESTREAMS_CREATE]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
