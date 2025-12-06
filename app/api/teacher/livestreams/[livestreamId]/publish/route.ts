import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ livestreamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = session.user.id;
    const user = session.user;

    const resolvedParams = await params;
    const { livestreamId } = resolvedParams;

    const liveStream = await db.liveStream.findFirst({
      where: { 
        id: livestreamId,
        course: {
          userId: userId
        }
      },
    });

    if (!liveStream) {
      return NextResponse.json({ error: "Live stream not found or access denied" }, { status: 404 });
    }

    const updatedLiveStream = await db.liveStream.updateMany({
      where: { 
        id: livestreamId,
        course: {
          userId: userId
        }
      },
      data: {
        isPublished: !liveStream.isPublished,
      },
    });

    if (updatedLiveStream.count === 0) {
      return NextResponse.json({ error: "Live stream not found or access denied" }, { status: 404 });
    }

    // Fetch the updated live stream with course info
    const finalLiveStream = await db.liveStream.findFirst({
      where: { 
        id: livestreamId,
        course: {
          userId: userId
        }
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(finalLiveStream);
  } catch (e) {
    console.error("[TEACHER_LIVESTREAM_PUBLISH]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
