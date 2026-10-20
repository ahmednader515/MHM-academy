import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions } from "@/lib/utils";
import { scoreQuiz, validQuizAnswers } from "@/lib/quiz-scoring";
import { hasSubscriptionAccess } from "@/lib/subscription-utils";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;
        const { answers } = await req.json();

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!validQuizAnswers(answers)) {
            return new NextResponse("Invalid quiz answers", { status: 400 });
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
            let hasAccess = course.purchases.length > 0;

            // If no purchase access, check subscription
            if (!hasAccess) {
                hasAccess = await hasSubscriptionAccess(userId, course);
            }

            if (!hasAccess) {
                return new NextResponse("Course access required", { status: 403 });
            }
        }

        return await (db as unknown as PrismaClient).$transaction(async (tx) => {
            // Serialize submissions across tabs/devices before checking the attempt limit.
            await tx.$queryRaw`SELECT "id" FROM "Quiz" WHERE "id" = ${resolvedParams.quizId} FOR UPDATE`;
            // Get the quiz with questions (quiz already fetched above, but need questions)
            const quizWithQuestions = await tx.quiz.findFirst({
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
                            correctAnswer: true,
                            points: true,
                            imageUrl: true
                        },
                        orderBy: {
                            position: 'asc'
                        }
                    }
                }
            });

            if (!quizWithQuestions) {
                return new NextResponse("Quiz not found", { status: 404 });
            }

            // Check if user has already taken this quiz and if they can take it again
            const existingResults = await tx.quizResult.findMany({
                where: {
                    studentId: userId,
                    quizId: resolvedParams.quizId
                },
                orderBy: {
                    attemptNumber: 'desc'
                }
            });

            const currentAttemptNumber = (existingResults[0]?.attemptNumber ?? 0) + 1;

            if (existingResults.length >= quizWithQuestions.maxAttempts) {
                return new NextResponse("Maximum attempts reached for this quiz", { status: 400 });
            }

            if (quizWithQuestions.questions.length === 0) {
                return new NextResponse("Quiz has no questions", { status: 400 });
            }
            const questionIds = new Set(quizWithQuestions.questions.map(question => question.id));
            if (answers.some(answer => !questionIds.has(answer.questionId))) {
                return new NextResponse("Quiz questions have changed. Please reload the quiz.", { status: 409 });
            }
            const { score: totalScore, totalPoints, percentage, quizAnswers } = scoreQuiz(quizWithQuestions.questions, answers);

            // Create quiz result
            const quizResult = await tx.quizResult.create({
                data: {
                    studentId: userId,
                    quizId: resolvedParams.quizId,
                    score: totalScore,
                    totalPoints,
                    percentage,
                    attemptNumber: currentAttemptNumber,
                    answers: {
                        create: quizAnswers
                    }
                },
                include: {
                    answers: {
                        include: {
                            question: true
                        }
                    }
                }
            });

            return NextResponse.json({
                ...quizResult,
                answers: quizResult.answers.map(answer => ({
                    ...answer,
                    question: {
                        ...answer.question,
                        options: parseQuizOptions(answer.question.options)
                    }
                }))
            });
        });
    } catch (error) {
        console.log("[QUIZ_SUBMIT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}