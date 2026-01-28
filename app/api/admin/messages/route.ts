import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // First, deactivate messages older than 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        await db.studentMessage.updateMany({
            where: {
                isActive: true,
                createdAt: {
                    lt: twentyFourHoursAgo
                }
            },
            data: {
                isActive: false
            }
        });

        const messages = await db.studentMessage.findMany({
            include: {
                creator: {
                    select: {
                        id: true,
                        fullName: true,
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("[ADMIN_MESSAGES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await req.json();
        const { message, isActive, targetCurriculum, targetLevel, targetLanguage, targetGrade } = body;

        if (!message || !message.trim()) {
            return new NextResponse("Message is required", { status: 400 });
        }

        const newMessage = await db.studentMessage.create({
            data: {
                message: message.trim(),
                isActive: isActive ?? true,
                targetCurriculum: targetCurriculum || null,
                targetLevel: targetLevel || null,
                targetLanguage: targetLanguage || null,
                targetGrade: targetGrade || null,
                createdBy: session.user.id,
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

        return NextResponse.json(newMessage);
    } catch (error) {
        console.error("[ADMIN_MESSAGES_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

