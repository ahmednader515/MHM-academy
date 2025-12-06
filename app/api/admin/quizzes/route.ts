import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { stringifyQuizOptions } from "@/lib/utils";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden - Only admins can access this resource" }, { status: 403 });
        }

        // Admins can see all quizzes from all teachers
        const quizzes = await db.quiz.findMany({
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                role: true,
                            }
                        }
                    }
                },
                questions: {
                    select: {
                        id: true,
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
        });

        return NextResponse.json(quizzes);
    } catch (error) {
        console.log("[ADMIN_QUIZZES_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden - Only admins can access this resource" }, { status: 403 });
        }

        const { title, description, courseId, questions, position, timer, maxAttempts } = await req.json();

        if (!title || !courseId || !questions || questions.length === 0) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Validate course exists
        const course = await db.course.findUnique({
            where: { id: courseId }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Create the quiz with questions
        const quiz = await db.quiz.create({
            data: {
                title,
                description: description || "",
                courseId,
                position: position || 1,
                timer: timer || null,
                maxAttempts: maxAttempts || 1,
                isPublished: true,
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

                        // For multiple choice questions, convert index/value to actual option text
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
        console.log("[ADMIN_QUIZZES_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}