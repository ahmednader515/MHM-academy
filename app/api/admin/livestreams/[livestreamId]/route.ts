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
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const resolvedParams = await params;
    const { livestreamId } = resolvedParams;

    const liveStream = await db.liveStream.findUnique({
      where: { id: livestreamId },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    if (!liveStream) {
      return NextResponse.json({ error: "Live stream not found" }, { status: 404 });
    }

    return NextResponse.json(liveStream);
  } catch (e) {
    console.error("[ADMIN_LIVESTREAM_GET]", e);
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
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    const liveStream = await db.liveStream.update({
      where: { id: livestreamId },
      data: updateData,
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(liveStream);
  } catch (e) {
    console.error("[ADMIN_LIVESTREAM_UPDATE]", e);
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
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const resolvedParams = await params;
    const { livestreamId } = resolvedParams;

    await db.liveStream.delete({
      where: { id: livestreamId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[ADMIN_LIVESTREAM_DELETE]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
