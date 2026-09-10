export const WRITTEN_QUESTION_TYPE = "SHORT_ANSWER";

export function isWrittenQuestion(type?: string | null) {
    return type === WRITTEN_QUESTION_TYPE;
}

export type QuizAnswerStatus = "pending" | "correct" | "incorrect";

export function getQuizAnswerStatus(answer: {
    isGraded?: boolean | null;
    isCorrect: boolean;
}): QuizAnswerStatus {
    if (answer.isGraded === false) {
        return "pending";
    }

    return answer.isCorrect ? "correct" : "incorrect";
}

export function countPendingWrittenAnswers(answers: Array<{
    isGraded?: boolean | null;
    question?: { type?: string | null };
}>) {
    return answers.filter(
        (answer) => isWrittenQuestion(answer.question?.type) && answer.isGraded === false
    ).length;
}
