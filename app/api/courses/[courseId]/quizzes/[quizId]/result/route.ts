import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if user has access to the course
        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                purchases: {
                    where: {
                        userId,
                        status: "ACTIVE"
                    }
                }
            }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        // If course is free, allow access
        if (!course.isFree) {
            // Check if user has purchased the course
            const hasAccess = course.purchases.length > 0;
            
            if (!hasAccess) {
                return new NextResponse("Course access required", { status: 403 });
            }
        }

        // Get the latest quiz result for this user (most recent attempt)
        const quizResult = await db.quizResult.findFirst({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            orderBy: {
                attemptNumber: 'desc'
            },
            include: {
                answers: {
                    include: {
                        question: {
                            select: {
                                text: true,
                                type: true,
                                points: true,
                                position: true
                            }
                        }
                    },
                    orderBy: {
                        question: {
                            position: 'asc'
                        }
                    }
                }
            }
        });

        if (!quizResult) {
            return new NextResponse("Quiz result not found", { status: 404 });
        }

        return NextResponse.json(quizResult);
    } catch (error) {
        console.log("[QUIZ_RESULT_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 