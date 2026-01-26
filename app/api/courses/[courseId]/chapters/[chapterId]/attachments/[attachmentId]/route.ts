import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string; attachmentId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        // Check if user is admin or course owner
        const whereClause = user.role === "ADMIN"
            ? { id: resolvedParams.courseId }
            : { id: resolvedParams.courseId, userId };

        const courseOwner = await db.course.findUnique({
            where: whereClause as any
        });

        if (!courseOwner) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if the attachment exists and belongs to the chapter
        const attachment = await db.chapterAttachment.findUnique({
            where: {
                id: resolvedParams.attachmentId,
            }
        });

        if (!attachment) {
            return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
        }

        if (attachment.chapterId !== resolvedParams.chapterId) {
            return NextResponse.json({ error: "Attachment does not belong to this chapter" }, { status: 403 });
        }

        // Delete the attachment
        await db.chapterAttachment.delete({
            where: {
                id: resolvedParams.attachmentId,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[CHAPTER_ATTACHMENT_DELETE]", error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : "Internal Error" 
        }, { status: 500 });
    }
} 