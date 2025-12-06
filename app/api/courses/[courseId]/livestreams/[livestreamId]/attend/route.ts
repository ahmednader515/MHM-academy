import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; livestreamId: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;
    const { livestreamId } = resolvedParams;

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Record attendance (upsert to avoid duplicates)
    await db.liveStreamAttendance.upsert({
      where: {
        liveStreamId_studentId: {
          liveStreamId: livestreamId,
          studentId: userId,
        },
      },
      update: {
        clickedAt: new Date(),
      },
      create: {
        liveStreamId: livestreamId,
        studentId: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LIVESTREAM_ATTEND]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

