import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { deleteS3ObjectByUrl } from "@/lib/s3";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; attachmentId: string }> }
) {
    const resolvedParams = await params;
    const { courseId, attachmentId } = resolvedParams;

    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const courseOwner = await db.course.findUnique({
            where: {
                id: courseId,
                userId: userId,
            }
        });

        if (!courseOwner) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const existingAttachment = await db.attachment.findUnique({
            where: {
                id: attachmentId,
                courseId: courseId,
            }
        });

        const attachment = await db.attachment.delete({
            where: {
                courseId: courseId,
                id: attachmentId,
            }
        });

        await deleteS3ObjectByUrl(existingAttachment?.url);

        return NextResponse.json(attachment);
    } catch (error) {
        console.log("ATTACHMENT_ID", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 
