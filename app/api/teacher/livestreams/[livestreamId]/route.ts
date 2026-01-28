import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { detectMeetingType, extractMeetingId, isValidMeetingUrl } from "@/lib/zoom";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ livestreamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = session.user.id;
    const user = session.user;
    const resolvedParams = await params;
    const { livestreamId } = resolvedParams;

    // Admins and supervisors can access any livestream, teachers only their own
    const whereClause = (user.role === "ADMIN" || user.role === "SUPERVISOR")
      ? { id: livestreamId }
      : { 
          id: livestreamId,
          course: {
            userId: userId
          }
        };

    const liveStream = await db.liveStream.findFirst({
      where: whereClause,
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    if (!liveStream) {
      return NextResponse.json({ error: "Live stream not found" }, { status: 404 });
    }

    return NextResponse.json(liveStream);
  } catch (e) {
    console.error("[TEACHER_LIVESTREAM_GET]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ livestreamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = session.user.id;
    const user = session.user;
    const resolvedParams = await params;
    const { livestreamId } = resolvedParams;
    const { title, description, meetingUrl, scheduledAt, duration, isPublished } = await req.json();

    // Validate meeting URL if provided
    if (meetingUrl && !isValidMeetingUrl(meetingUrl)) {
      return NextResponse.json({ error: "Invalid meeting URL. Please provide a valid Zoom or Google Meet URL." }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    if (meetingUrl) {
      const meetingType = detectMeetingType(meetingUrl);
      if (!meetingType) {
        return NextResponse.json({ error: "Could not detect meeting type" }, { status: 400 });
      }

      const meetingId = extractMeetingId(meetingUrl, meetingType);
      if (!meetingId) {
        return NextResponse.json({ error: "Could not extract meeting ID" }, { status: 400 });
      }

      updateData.meetingUrl = meetingUrl;
      updateData.meetingId = meetingId;
      updateData.meetingType = meetingType;
    }

    // Admins and supervisors can update any livestream, teachers only their own
    const whereClause = (user.role === "ADMIN" || user.role === "SUPERVISOR")
      ? { id: livestreamId }
      : { 
          id: livestreamId,
          course: {
            userId: userId
          }
        };

    const liveStream = await db.liveStream.updateMany({
      where: whereClause,
      data: updateData,
    });

    if (liveStream.count === 0) {
      return NextResponse.json({ error: "Live stream not found or access denied" }, { status: 404 });
    }

    // Fetch the updated live stream
    const updatedLiveStream = await db.liveStream.findFirst({
      where: { id: livestreamId },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(updatedLiveStream);
  } catch (e) {
    console.error("[TEACHER_LIVESTREAM_UPDATE]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ livestreamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = session.user.id;
    const user = session.user;
    const resolvedParams = await params;
    const { livestreamId } = resolvedParams;

    // Admins and supervisors can delete any livestream, teachers only their own
    const whereClause = (user.role === "ADMIN" || user.role === "SUPERVISOR")
      ? { id: livestreamId }
      : { 
          id: livestreamId,
          course: {
            userId: userId
          }
        };

    const deletedLiveStream = await db.liveStream.deleteMany({
      where: whereClause,
    });

    if (deletedLiveStream.count === 0) {
      return NextResponse.json({ error: "Live stream not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[TEACHER_LIVESTREAM_DELETE]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
