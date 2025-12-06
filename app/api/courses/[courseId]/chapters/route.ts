import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    const chapters = await db.chapter.findMany({
      where: {
        courseId: resolvedParams.courseId,
      },
      orderBy: {
        position: "asc",
      },
      include: {
        userProgress: {
          where: {
            userId,
          }
        }
      }
    });

    return NextResponse.json(chapters);
  } catch (error) {
    console.log("[CHAPTERS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;
        const { title, isFree } = await req.json();

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        // Check if user is admin or course owner
        const whereClause = user?.role === "ADMIN"
            ? { id: resolvedParams.courseId }
            : { id: resolvedParams.courseId, userId };

        const courseOwner = await db.course.findUnique({
            where: whereClause
        });

        if (!courseOwner) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const lastChapter = await db.chapter.findFirst({
            where: {
                courseId: resolvedParams.courseId,
            },
            orderBy: {
                position: "desc",
            },
        });

        const newPosition = lastChapter ? lastChapter.position + 1 : 1;

        const chapter = await db.chapter.create({
            data: {
                title,
                courseId: resolvedParams.courseId,
                position: newPosition,
                isFree: isFree || false,
            }
        });

        return NextResponse.json(chapter);
    } catch (error) {
        console.log("[CHAPTERS]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 