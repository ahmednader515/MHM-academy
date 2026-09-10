"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, FileText, User, Calendar, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { parseQuizOptions } from "@/lib/utils";
import { useLanguage } from "@/lib/contexts/language-context";
import { countPendingWrittenAnswers, getQuizAnswerStatus, isWrittenQuestion } from "@/lib/quiz-answer-status";

interface QuizResultDetailProps {
    role: "teacher" | "admin";
    params: Promise<{ resultId: string }>;
}

interface QuizAnswer {
    id: string;
    questionId: string;
    studentAnswer: string;
    correctAnswer?: string;
    isCorrect: boolean;
    isGraded?: boolean;
    pointsEarned: number;
    question: {
        text: string;
        type: string;
        points: number;
        options?: string[];
        correctAnswer?: string;
        imageUrl?: string;
    };
}

interface QuizResult {
    id: string;
    studentId: string;
    quizId: string;
    score: number;
    totalPoints: number;
    submittedAt: string;
    user: {
        fullName: string;
        phoneNumber: string;
    };
    quiz: {
        title: string;
        course: {
            id: string;
            title: string;
        };
    };
    answers: QuizAnswer[];
}

export const QuizResultDetail = ({ role, params }: QuizResultDetailProps) => {
    const router = useRouter();
    const { t, isRTL } = useLanguage();
    const [result, setResult] = useState<QuizResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [gradingAnswerId, setGradingAnswerId] = useState<string | null>(null);
    const resolvedParams = use(params);
    const { resultId } = resolvedParams;
    const basePath = role === "admin" ? "/dashboard/admin" : "/dashboard/teacher";
    const resultsApi = role === "admin" ? "/api/admin/quiz-results" : "/api/teacher/quiz-results";

    useEffect(() => {
        fetchQuizResult();
    }, [resultId]);

    const applyResultData = (data: any) => {
        const parsedData = {
            ...data,
            answers: data.answers.map((answer: any) => ({
                ...answer,
                question: {
                    ...answer.question,
                    options: parseQuizOptions(answer.question.options)
                }
            }))
        };
        setResult(parsedData);
    };

    const fetchQuizResult = async () => {
        try {
            const response = await fetch(`${resultsApi}/${resultId}`);
            if (response.ok) {
                const data = await response.json();
                applyResultData(data);
            } else {
                toast.error(t("teacher.quizNotFound"));
                router.push(`${basePath}/quizzes`);
            }
        } catch (error) {
            console.error("Error fetching quiz result:", error);
            toast.error(t("teacher.errorLoadingResults"));
        } finally {
            setLoading(false);
        }
    };

    const gradeWrittenAnswer = async (answerId: string, isCorrect: boolean) => {
        setGradingAnswerId(answerId);
        try {
            const response = await fetch(`${resultsApi}/${resultId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ answerId, isCorrect })
            });

            if (response.ok) {
                const data = await response.json();
                applyResultData(data);
                toast.success(t("teacher.gradeSaved"));
            } else {
                toast.error(t("teacher.gradeSaveError"));
            }
        } catch (error) {
            console.error("Error grading written answer:", error);
            toast.error(t("teacher.gradeSaveError"));
        } finally {
            setGradingAnswerId(null);
        }
    };

    const calculatePercentage = (score: number, totalPoints: number) => {
        return totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    };

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return "text-green-600";
        if (percentage >= 80) return "text-orange-600";
        if (percentage >= 70) return "text-yellow-600";
        if (percentage >= 60) return "text-orange-600";
        return "text-red-600";
    };

    const getGradeBadge = (percentage: number) => {
        if (percentage >= 90) return { variant: "default" as const, text: t("teacher.excellent") };
        if (percentage >= 80) return { variant: "default" as const, text: t("teacher.veryGood") };
        if (percentage >= 70) return { variant: "secondary" as const, text: t("teacher.good") };
        if (percentage >= 60) return { variant: "outline" as const, text: t("teacher.acceptable") };
        return { variant: "destructive" as const, text: t("teacher.weak") };
    };

    const renderStatusBadge = (answer: QuizAnswer) => {
        const status = getQuizAnswerStatus(answer);
        if (status === "pending") {
            return (
                <Badge variant="outline" className="border-amber-500 text-amber-700">
                    {t("teacher.pendingReview")}
                </Badge>
            );
        }

        return status === "correct" ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
            <XCircle className="h-5 w-5 text-red-600" />
        );
    };

    const renderQuestionChoices = (answer: QuizAnswer) => {
        if (answer.question.type === "MULTIPLE_CHOICE" && answer.question.options) {
            return (
                <div className="space-y-2">
                    <h5 className="font-medium text-sm">{t("teacher.options")}:</h5>
                    <div className="space-y-1">
                        {answer.question.options.map((option: string, optionIndex: number) => (
                            <div
                                key={optionIndex}
                                className={`p-2 rounded border ${
                                    option === answer.studentAnswer
                                        ? answer.isCorrect
                                            ? "bg-green-50 border-green-200"
                                            : "bg-red-50 border-red-200"
                                        : option === answer.question.correctAnswer
                                            ? "bg-green-50 border-green-200"
                                            : "bg-gray-50"
                                }`}
                            >
                                <span className="text-sm">
                                    {optionIndex + 1}. {option}
                                    {option === answer.studentAnswer && (
                                        <Badge variant={answer.isCorrect ? "default" : "destructive"} className={isRTL ? "mr-2" : "ml-2"}>
                                            {t("teacher.studentAnswer")}
                                        </Badge>
                                    )}
                                    {option === answer.question.correctAnswer && option !== answer.studentAnswer && (
                                        <Badge variant="default" className={isRTL ? "mr-2" : "ml-2"}>
                                            {t("teacher.correctAnswer")}
                                        </Badge>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t("teacher.loading")}</div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="p-6">
                <div className="text-center">{t("teacher.noResultsToDisplay")}</div>
            </div>
        );
    }

    const percentage = calculatePercentage(result.score, result.totalPoints);
    const grade = getGradeBadge(percentage);
    const pendingCount = countPendingWrittenAnswers(result.answers);
    const correctCount = result.answers.filter((answer) => getQuizAnswerStatus(answer) === "correct").length;
    const incorrectCount = result.answers.filter((answer) => getQuizAnswerStatus(answer) === "incorrect").length;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`${basePath}/quiz-results?quizId=${result.quizId}`)}
                    >
                        <ArrowLeft className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                        {t("teacher.back")}
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t("teacher.resultDetails")}
                    </h1>
                </div>
            </div>

            {pendingCount > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    {t("teacher.pendingScoreNote")} ({pendingCount})
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("teacher.studentAndQuizInfo")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-3">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <h4 className="font-medium">{t("teacher.student")}</h4>
                                        <p className="text-sm text-muted-foreground">{result.user.fullName}</p>
                                        <p className="text-xs text-muted-foreground">{result.user.phoneNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <h4 className="font-medium">{t("teacher.test")}</h4>
                                        <p className="text-sm text-muted-foreground">{result.quiz.title}</p>
                                        <p className="text-xs text-muted-foreground">{result.quiz.course.title}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <h4 className="font-medium">{t("teacher.submissionDate")}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(result.submittedAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US")}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <h4 className="font-medium">{t("teacher.submissionTime")}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(result.submittedAt).toLocaleTimeString(isRTL ? "ar-EG" : "en-US")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("teacher.finalResult")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center p-4 border rounded-lg">
                                    <div className="text-2xl font-bold">{result.score} / {result.totalPoints}</div>
                                    <p className="text-sm text-muted-foreground">{t("teacher.grade")}</p>
                                </div>
                                <div className="text-center p-4 border rounded-lg">
                                    <div className={`text-2xl font-bold ${getGradeColor(percentage)}`}>
                                        {percentage}%
                                    </div>
                                    <p className="text-sm text-muted-foreground">{t("teacher.percentage")}</p>
                                </div>
                                <div className="text-center p-4 border rounded-lg">
                                    {pendingCount > 0 ? (
                                        <Badge variant="outline" className="text-lg px-4 py-2 border-amber-500 text-amber-700">
                                            {t("teacher.needsGrading")}
                                        </Badge>
                                    ) : (
                                        <Badge variant={grade.variant} className="text-lg px-4 py-2">
                                            {grade.text}
                                        </Badge>
                                    )}
                                    <p className="text-sm text-muted-foreground mt-2">{t("teacher.evaluation")}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("teacher.answerDetails")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {result.answers.map((answer, index) => {
                                const status = getQuizAnswerStatus(answer);
                                const pointsEarned = status === "pending" ? 0 : answer.pointsEarned;

                                return (
                                    <div key={answer.id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium">{t("teacher.question")} {index + 1}</h4>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{answer.question.points} {t("teacher.points")}</Badge>
                                                <Badge variant="secondary">{answer.question.type}</Badge>
                                                {renderStatusBadge(answer)}
                                            </div>
                                        </div>

                                        <p className="text-muted-foreground mb-3">{answer.question.text}</p>

                                        {answer.question.imageUrl && (
                                            <div className="mb-3">
                                                <img
                                                    src={answer.question.imageUrl}
                                                    alt="Question"
                                                    className="max-w-full h-auto max-h-64 rounded-lg border shadow-sm"
                                                />
                                            </div>
                                        )}

                                        {answer.question.type === "MULTIPLE_CHOICE" && renderQuestionChoices(answer)}

                                        {answer.question.type === "TRUE_FALSE" && (
                                            <div className="space-y-2">
                                                <h5 className="font-medium text-sm">{t("teacher.options")}:</h5>
                                                <div className="space-y-1">
                                                    {["true", "false"].map((option) => (
                                                        <div
                                                            key={option}
                                                            className={`p-2 rounded border ${
                                                                answer.studentAnswer === option
                                                                    ? answer.isCorrect
                                                                        ? "bg-green-50 border-green-200"
                                                                        : "bg-red-50 border-red-200"
                                                                    : answer.question.correctAnswer === option
                                                                        ? "bg-green-50 border-green-200"
                                                                        : "bg-gray-50"
                                                            }`}
                                                        >
                                                            <span className="text-sm">
                                                                {option === "true" ? t("teacher.true") : t("teacher.false")}
                                                                {answer.studentAnswer === option && (
                                                                    <Badge variant={answer.isCorrect ? "default" : "destructive"} className={isRTL ? "mr-2" : "ml-2"}>
                                                                        {t("teacher.studentAnswer")}
                                                                    </Badge>
                                                                )}
                                                                {answer.question.correctAnswer === option && answer.studentAnswer !== option && (
                                                                    <Badge variant="default" className={isRTL ? "mr-2" : "ml-2"}>
                                                                        {t("teacher.correctAnswer")}
                                                                    </Badge>
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {isWrittenQuestion(answer.question.type) && (
                                            <div className="space-y-3">
                                                {answer.question.correctAnswer && (
                                                    <div>
                                                        <h5 className="font-medium text-sm mb-1">{t("teacher.referenceAnswer")}:</h5>
                                                        <p className="text-sm bg-slate-50 p-2 rounded border">
                                                            {answer.question.correctAnswer}
                                                        </p>
                                                    </div>
                                                )}
                                                <div>
                                                    <h5 className="font-medium text-sm mb-1">{t("teacher.studentAnswer")}:</h5>
                                                    <p className={`text-sm p-2 rounded border ${
                                                        status === "correct"
                                                            ? "bg-green-50 border-green-200"
                                                            : status === "incorrect"
                                                                ? "bg-red-50 border-red-200"
                                                                : "bg-amber-50 border-amber-200"
                                                    }`}>
                                                        {answer.studentAnswer || t("teacher.noAnswer")}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={status === "correct" ? "default" : "outline"}
                                                        className={status === "correct" ? "bg-green-600 hover:bg-green-700" : ""}
                                                        onClick={() => gradeWrittenAnswer(answer.id, true)}
                                                        disabled={gradingAnswerId === answer.id}
                                                    >
                                                        {gradingAnswerId === answer.id ? (
                                                            <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} />
                                                        ) : (
                                                            <CheckCircle className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                                                        )}
                                                        {t("teacher.markAsCorrect")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={status === "incorrect" ? "destructive" : "outline"}
                                                        onClick={() => gradeWrittenAnswer(answer.id, false)}
                                                        disabled={gradingAnswerId === answer.id}
                                                    >
                                                        {gradingAnswerId === answer.id ? (
                                                            <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} />
                                                        ) : (
                                                            <XCircle className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                                                        )}
                                                        {t("teacher.markAsIncorrect")}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-3 pt-3 border-t">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{t("teacher.pointsEarned")}:</span>
                                                <span className={`text-sm font-medium ${
                                                    status === "correct"
                                                        ? "text-green-600"
                                                        : status === "incorrect"
                                                            ? "text-red-600"
                                                            : "text-amber-700"
                                                }`}>
                                                    {status === "pending" ? t("teacher.pendingReview") : `${pointsEarned} / ${answer.question.points}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("teacher.resultSummary")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span>{t("teacher.totalPoints")}</span>
                                <Badge variant="default">{result.totalPoints} {t("teacher.points")}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>{t("teacher.pointsEarned")}</span>
                                <Badge variant="secondary">{result.score} {t("teacher.points")}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>{t("teacher.correctQuestionsCount")}</span>
                                <Badge variant="default">{correctCount}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>{t("teacher.incorrectQuestionsCount")}</span>
                                <Badge variant="destructive">{incorrectCount}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>{t("teacher.needsGrading")}</span>
                                <Badge variant="outline" className="border-amber-500 text-amber-700">{pendingCount}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("teacher.quickActions")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => router.push(`${basePath}/quiz-results?quizId=${result.quizId}`)}
                            >
                                {t("teacher.allResultsForThisQuiz")}
                            </Button>
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => router.push(`${basePath}/quizzes/${result.quizId}`)}
                            >
                                {t("teacher.viewQuizDetails")}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
