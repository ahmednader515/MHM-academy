import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { detectMeetingType, extractMeetingId, isValidMeetingUrl } from "@/lib/zoom";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const liveStreams = await db.liveStream.findMany({
      include: {
        course: { 
          select: { 
            id: true, 
            title: true,
            targetCurriculum: true,
            targetCurriculumType: true,
            targetLevel: true,
            targetLanguage: true,
            targetGrade: true,
            user: {
              select: {
                id: true,
                fullName: true,
                role: true,
              }
            }
          } 
        },
        attendance: {
          select: {
            id: true,
            studentId: true,
            clickedAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Add attendance count and expired status
    const now = new Date();
    const liveStreamsWithStatus = liveStreams.map(stream => {
      const isExpired = stream.scheduledAt && stream.duration
        ? now > new Date(new Date(stream.scheduledAt).getTime() + stream.duration * 60 * 1000)
        : false;
      
      return {
        ...stream,
        attendanceCount: stream.attendance.length,
        isExpired
      };
    });

    return NextResponse.json(liveStreamsWithStatus);
  } catch (e) {
    console.error("[ADMIN_LIVESTREAMS]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    console.error("[ADMIN_LIVESTREAMS_CREATE]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
