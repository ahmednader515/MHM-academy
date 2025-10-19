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

        // Get basic quiz info without attempt restrictions (quiz already fetched above)
        const quizInfo = await db.quiz.findFirst({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            select: {
                id: true,
                title: true,
                maxAttempts: true,
                timer: true
            }
        });

        if (!quizInfo) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // Get attempt information
        const existingResults = await db.quizResult.findMany({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            orderBy: {
                attemptNumber: 'desc'
            }
        });

        const currentAttemptNumber = existingResults.length + 1;

        // Return quiz info with attempt data
        const quizInfoResponse = {
            ...quizInfo,
            currentAttempt: currentAttemptNumber,
            previousAttempts: existingResults.length
        };

        return NextResponse.json(quizInfoResponse);
    } catch (error) {
        console.log("[QUIZ_INFO_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 