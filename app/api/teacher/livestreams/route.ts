import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { detectMeetingType, extractMeetingId, isValidMeetingUrl } from "@/lib/zoom";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const userId = session.user.id;
    const user = session.user;
    
    if (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden - Only teachers, admins, and supervisors can access this resource" }, { status: 403 });

    // Teachers can only see live streams for their own courses
    // Admins and supervisors can see all live streams
    const whereClause = (user.role === "ADMIN" || user.role === "SUPERVISOR")
      ? {}
      : {
          course: {
            userId: userId
          }
        };

    const liveStreams = await db.liveStream.findMany({
      where: whereClause,
      include: {
        course: { select: { id: true, title: true } },
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
    console.error("[TEACHER_LIVESTREAMS]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const userId = session.user.id;
    const user = session.user;
    
    if (user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden - Only teachers can access this resource" }, { status: 403 });

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

    // Validate course exists and belongs to the teacher (or user is admin/supervisor)
    const whereClause = (user.role === "ADMIN" || user.role === "SUPERVISOR")
      ? { id: courseId }
      : { 
          id: courseId,
          userId: userId
        };

    const course = await db.course.findFirst({
      where: whereClause
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found or access denied" }, { status: 404 });
    }

    // Get the next position (max position + 1)
    const lastContent = await db.$transaction([
      db.chapter.findFirst({
        where: { courseId },
        orderBy: { position: 'desc' },
        select: { position: true }
      }),
      db.quiz.findFirst({
        where: { courseId },
        orderBy: { position: 'desc' },
        select: { position: true }
      }),
      db.liveStream.findFirst({
        where: { courseId },
        orderBy: { position: 'desc' },
        select: { position: true }
      })
    ]);

    const maxPosition = Math.max(
      lastContent[0]?.position || 0,
      lastContent[1]?.position || 0,
      lastContent[2]?.position || 0
    );
    const nextPosition = maxPosition + 1;

    const liveStream = await db.liveStream.create({
      data: {
        title,
        description,
        meetingUrl,
        meetingId,
        meetingType,
        courseId,
        position: nextPosition,
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
