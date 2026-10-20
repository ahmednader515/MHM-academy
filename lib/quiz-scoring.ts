import { parseQuizOptions } from "./utils";

export interface SubmittedQuizAnswer {
    questionId: string;
    answer: string;
}

export function validQuizAnswers(value: unknown): value is SubmittedQuizAnswer[] {
    if (!Array.isArray(value)) return false;
    const seen = new Set<string>();
    return value.every(item => {
        if (!item || typeof item.questionId !== "string" || typeof item.answer !== "string" || seen.has(item.questionId)) return false;
        seen.add(item.questionId);
        return true;
    });
}

export function scoreQuiz(questions: Array<{
    id: string; type: string; options: string | null; correctAnswer: string; points: number;
}>, answers: SubmittedQuizAnswer[]) {
    const submitted = new Map(answers.map(answer => [answer.questionId, answer.answer]));
    const quizAnswers = questions.map(question => {
        const studentAnswer = submitted.get(question.id) ?? "";
        const expected = question.correctAnswer.trim();
        const actual = studentAnswer.trim();
        const isGraded = question.type !== "SHORT_ANSWER";
        let isCorrect = false;
        if (actual && question.type === "MULTIPLE_CHOICE") {
            isCorrect = actual === expected && parseQuizOptions(question.options).some(option => option.trim() === expected);
        } else if (actual && question.type === "TRUE_FALSE") {
            isCorrect = ["true", "false"].includes(expected.toLowerCase()) && actual.toLowerCase() === expected.toLowerCase();
        }
        return { questionId: question.id, studentAnswer, correctAnswer: question.correctAnswer,
            isCorrect, isGraded, pointsEarned: isCorrect ? question.points : 0 };
    });
    const score = quizAnswers.reduce((sum, answer) => sum + answer.pointsEarned, 0);
    const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
    return { score, totalPoints, percentage: totalPoints > 0 ? score / totalPoints * 100 : 0, quizAnswers };
}
