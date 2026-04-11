import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isValidGoogleDriveVideoUrl,
  normalizeGoogleDriveEmbedUrl,
} from "@/lib/google-drive";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user;

    const course =
      user?.role === "ADMIN" || user?.role === "SUPERVISOR"
        ? await db.course.findUnique({
            where: { id: resolvedParams.courseId },
          })
        : await db.course.findUnique({
            where: { id: resolvedParams.courseId, userId },
          });

    if (!course) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { driveUrl } = await req.json();

    if (!driveUrl || typeof driveUrl !== "string") {
      return new NextResponse("Missing Google Drive URL", { status: 400 });
    }

    if (!isValidGoogleDriveVideoUrl(driveUrl)) {
      return new NextResponse("Invalid Google Drive URL", { status: 400 });
    }

    const embedUrl = normalizeGoogleDriveEmbedUrl(driveUrl);
    if (!embedUrl) {
      return new NextResponse("Could not build embed URL", { status: 400 });
    }

    await db.chapter.update({
      where: {
        id: resolvedParams.chapterId,
        courseId: resolvedParams.courseId,
      },
      data: {
        videoUrl: embedUrl,
        videoType: "GOOGLE_DRIVE",
        youtubeVideoId: null,
      },
    });

    return NextResponse.json({
      success: true,
      url: embedUrl,
    });
  } catch (error) {
    console.log("[CHAPTER_GOOGLE_DRIVE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
