import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions, stringifyQuizOptions } from "@/lib/utils";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        if (user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
            return NextResponse.json({ error: "Forbidden - Only admins and supervisors can access this resource" }, { status: 403 });
        }

        const resolvedParams = await params;
        const { quizId } = resolvedParams;

        const quiz = await db.quiz.findUnique({
            where: { id: quizId },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                questions: {
                    orderBy: {
                        position: "asc",
                    },
                },
            },
        });

        if (!quiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        const quizWithParsedOptions = {
            ...quiz,
            questions: quiz.questions.map(question => ({
                ...question,
                options: parseQuizOptions(question.options as string | null),
            })),
        };

        return NextResponse.json(quizWithParsedOptions);
    } catch (error) {
        console.log("[ADMIN_QUIZ_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        if (user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
            return NextResponse.json({ error: "Forbidden - Only admins and supervisors can access this resource" }, { status: 403 });
        }

        const resolvedParams = await params;
        const { quizId } = resolvedParams;
        const { title, description, courseId, questions, position, timer, maxAttempts } = await req.json();

        // Check if quiz exists
        const existingQuiz = await db.quiz.findUnique({
            where: { id: quizId },
            include: { questions: true },
        });

        if (!existingQuiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        // Delete existing questions
        await db.question.deleteMany({
            where: { quizId },
        });

        // Update quiz and create new questions
        const quiz = await db.quiz.update({
            where: { id: quizId },
            data: {
                title,
                description: description || "",
                courseId,
                position: position || existingQuiz.position,
                timer: timer || null,
                maxAttempts: maxAttempts || 1,
                questions: {
                    create: questions.map((q: any, index: number) => {
                        const rawOptions = Array.isArray(q.options) ? q.options : [];
                        const cleanedOptions = rawOptions
                            .filter((option: string) => typeof option === "string" && option.trim().length > 0)
                            .map((option: string) => option.trim());

                        const optionsString = q.type === "MULTIPLE_CHOICE"
                            ? stringifyQuizOptions(cleanedOptions)
                            : null;

                        let correctAnswerValue = q.correctAnswer;

                        if (q.type === "MULTIPLE_CHOICE") {
                            if (typeof q.correctAnswer === "number") {
                                correctAnswerValue = cleanedOptions[q.correctAnswer] ?? "";
                            } else if (typeof q.correctAnswer === "string") {
                                const match = cleanedOptions.find((option) => option === q.correctAnswer);
                                correctAnswerValue = match ?? q.correctAnswer;
                            }
                        }

                        return {
                            text: q.text,
                            imageUrl: q.imageUrl || null,
                            type: q.type,
                            options: optionsString,
                            correctAnswer: correctAnswerValue?.toString() ?? "",
                            points: q.points,
                            position: index + 1,
                        };
                    }),
                },
            },
            include: {
                questions: true,
                course: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        return NextResponse.json(quiz);
    } catch (error) {
        console.log("[ADMIN_QUIZ_PATCH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        if (user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const resolvedParams = await params;

        await db.quiz.delete({
            where: {
                id: resolvedParams.quizId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.log("[ADMIN_QUIZ_DELETE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

