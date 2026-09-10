import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { isWrittenQuestion } from "@/lib/quiz-answer-status";

export const quizResultDetailInclude = {
    user: {
        select: {
            fullName: true,
            phoneNumber: true
        }
    },
    quiz: {
        select: {
            title: true,
            course: {
                select: {
                    id: true,
                    title: true
                }
            }
        }
    },
    answers: {
        include: {
            question: {
                select: {
                    text: true,
                    type: true,
                    points: true,
                    options: true,
                    correctAnswer: true,
                    position: true,
                    imageUrl: true
                }
            }
        },
        orderBy: {
            question: {
                position: "asc" as const
            }
        }
    }
} satisfies Prisma.QuizResultInclude;

export async function getQuizResultDetail(where: Prisma.QuizResultWhereInput) {
    return db.quizResult.findFirst({
        where,
        include: quizResultDetailInclude
    });
}

export async function gradeWrittenQuizAnswer(params: {
    resultId: string;
    answerId: string;
    isCorrect: boolean;
    accessWhere: Prisma.QuizResultWhereInput;
}) {
    const result = await db.quizResult.findFirst({
        where: {
            id: params.resultId,
            ...params.accessWhere
        },
        include: {
            answers: {
                include: {
                    question: {
                        select: {
                            type: true,
                            points: true
                        }
                    }
                }
            }
        }
    });

    if (!result) {
        return { error: "not_found" as const };
    }

    const answer = result.answers.find((item) => item.id === params.answerId);
    if (!answer) {
        return { error: "answer_not_found" as const };
    }

    if (!isWrittenQuestion(answer.question.type)) {
        return { error: "not_written" as const };
    }

    const pointsEarned = params.isCorrect ? answer.question.points : 0;
    const nextScore = result.answers.reduce((sum, item) => {
        if (item.id === answer.id) {
            return sum + pointsEarned;
        }
        return sum + item.pointsEarned;
    }, 0);
    const percentage = result.totalPoints > 0 ? (nextScore / result.totalPoints) * 100 : 0;

    await db.$transaction([
        db.quizAnswer.update({
            where: { id: answer.id },
            data: {
                isCorrect: params.isCorrect,
                isGraded: true,
                pointsEarned
            }
        }),
        db.quizResult.update({
            where: { id: result.id },
            data: {
                score: nextScore,
                percentage
            }
        })
    ]);

    const updated = await getQuizResultDetail({ id: result.id });
    return { error: null, result: updated };
}
