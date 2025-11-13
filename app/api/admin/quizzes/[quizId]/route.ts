import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden - Only admins can access this resource" }, { status: 403 });
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

        return NextResponse.json(quiz);
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
        const { userId, user } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden - Only admins can access this resource" }, { status: 403 });
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
        await db.quizQuestion.deleteMany({
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
                    create: questions.map((q: any, index: number) => ({
                        text: q.text,
                        imageUrl: q.imageUrl || null,
                        type: q.type,
                        options: q.options || [],
                        correctAnswer: q.type === "MULTIPLE_CHOICE" && typeof q.correctAnswer === 'number'
                            ? q.options[q.correctAnswer]
                            : q.correctAnswer.toString(),
                        points: q.points,
                        position: index + 1,
                    })),
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

