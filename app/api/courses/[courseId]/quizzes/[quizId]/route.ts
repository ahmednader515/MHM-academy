import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions, stringifyQuizOptions } from "@/lib/utils";
import { hasSubscriptionAccess, courseMatchesSubscription } from "@/lib/subscription-utils";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;

        // Check if user has access to the course
        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                purchases: {
                    where: {
                        userId
                    }
                }
            }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        // If course is free, allow access
        if (course.isFree) {
            // Course is free, allow access
        } else {
            // Check if user has purchased the course
            let hasAccess = course.purchases.some(purchase => purchase.status === "ACTIVE");
            
            // If no purchase access, check subscription
            if (!hasAccess) {
                hasAccess = await hasSubscriptionAccess(userId, course);
            }
            
            if (!hasAccess) {
                // Check if user has an expired subscription that previously granted access
                const expiredSubscription = await (db as any).subscription.findFirst({
                    where: {
                        userId,
                        status: "EXPIRED",
                    },
                    include: {
                        plan: true,
                    },
                    orderBy: {
                        endDate: "desc",
                    },
                });

                if (expiredSubscription && courseMatchesSubscription(course, expiredSubscription)) {
                    return NextResponse.json({ 
                        error: "SUBSCRIPTION_EXPIRED",
                        subscriptionEndDate: expiredSubscription.endDate 
                    }, { status: 403 });
                }
                
                return new NextResponse(JSON.stringify({ error: "Course access required" }), { 
                    status: 403,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        // Get the quiz
        const quiz = await db.quiz.findFirst({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                questions: {
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        points: true,
                        imageUrl: true
                    },
                    orderBy: {
                        position: "asc"
                    }
                }
            }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // Quiz already fetched above with questions included
        // Don't parse options here - the frontend will handle parsing
        // This keeps the original string format for consistency

        // Check if user has already taken this quiz and if they can take it again
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

        if (existingResults.length >= quiz.maxAttempts) {
            return new NextResponse("Maximum attempts reached for this quiz", { status: 400 });
        }

        // Add attempt information to the quiz response
        const quizWithAttemptInfo = {
            ...quiz,
            currentAttempt: currentAttemptNumber,
            maxAttempts: quiz.maxAttempts,
            previousAttempts: existingResults.length
        };

        return NextResponse.json(quizWithAttemptInfo);
    } catch (error) {
        console.log("[QUIZ_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;
        const { title, description, questions, position } = await req.json();

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;

        const user = session.user;
        
        // Check if user is admin, supervisor, or course owner
        const whereClause = (user?.role === "ADMIN" || user?.role === "SUPERVISOR")
            ? { id: resolvedParams.courseId }
            : { id: resolvedParams.courseId, userId };

        const course = await db.course.findUnique({
            where: whereClause
        });

        if (!course) {
            return new NextResponse("Course not found or unauthorized", { status: 404 });
        }

        // Update the quiz
        const updatedQuiz = await db.quiz.update({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId
            },
            data: {
                title,
                description,
                position,
                questions: {
                    deleteMany: {},
                    create: questions.map((question: any, index: number) => ({
                        text: question.text,
                        type: question.type,
                        options: question.type === "MULTIPLE_CHOICE" ? stringifyQuizOptions(question.options) : null,
                        correctAnswer: question.correctAnswer,
                        points: question.points,
                        imageUrl: question.imageUrl || null,
                        position: index + 1
                    }))
                }
            },
            include: {
                course: {
                    select: {
                        title: true
                    }
                },
                questions: {
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        return NextResponse.json(updatedQuiz);
    } catch (error) {
        console.log("[QUIZ_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;

        const user = session.user;
        
        // Check if user is admin, supervisor, or course owner
        const whereClause = (user?.role === "ADMIN" || user?.role === "SUPERVISOR")
            ? { id: resolvedParams.courseId }
            : { id: resolvedParams.courseId, userId };

        const course = await db.course.findUnique({
            where: whereClause
        });

        if (!course) {
            return new NextResponse("Course not found or unauthorized", { status: 404 });
        }

        // Delete the quiz and all related data
        await db.quiz.delete({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[QUIZ_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 