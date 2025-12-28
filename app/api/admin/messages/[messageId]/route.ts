import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ messageId: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const resolvedParams = await params;
        const body = await req.json();
        const { message, isActive, targetCurriculum, targetLevel, targetLanguage, targetGrade } = body;

        if (!message || !message.trim()) {
            return new NextResponse("Message is required", { status: 400 });
        }

        const updatedMessage = await db.studentMessage.update({
            where: { id: resolvedParams.messageId },
            data: {
                message: message.trim(),
                isActive: isActive ?? true,
                targetCurriculum: targetCurriculum || null,
                targetLevel: targetLevel || null,
                targetLanguage: targetLanguage || null,
                targetGrade: targetGrade || null,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        fullName: true,
                    }
                }
            }
        });

        return NextResponse.json(updatedMessage);
    } catch (error) {
        console.error("[ADMIN_MESSAGES_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ messageId: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const resolvedParams = await params;

        await db.studentMessage.delete({
            where: { id: resolvedParams.messageId },
        });

        return new NextResponse("Message deleted", { status: 200 });
    } catch (error) {
        console.error("[ADMIN_MESSAGES_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

