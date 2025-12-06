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
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const resolvedParams = await params;
    const { livestreamId } = resolvedParams;

    const liveStream = await db.liveStream.findUnique({
      where: { id: livestreamId },
    });

    if (!liveStream) {
      return NextResponse.json({ error: "Live stream not found" }, { status: 404 });
    }

    const updatedLiveStream = await db.liveStream.update({
      where: { id: livestreamId },
      data: {
        isPublished: !liveStream.isPublished,
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(updatedLiveStream);
  } catch (e) {
    console.error("[ADMIN_LIVESTREAM_PUBLISH]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
