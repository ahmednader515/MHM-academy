"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";
import { countPendingWrittenAnswers } from "@/lib/quiz-answer-status";

interface QuizResultsListProps {
    role: "teacher" | "admin";
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
    answers: Array<{
        id: string;
        isCorrect: boolean;
        isGraded?: boolean;
        question: {
            type: string;
        };
    }>;
}

const QuizResultsListContent = ({ role }: QuizResultsListProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quizId = searchParams.get("quizId");
    const { t, isRTL } = useLanguage();
    const basePath = role === "admin" ? "/dashboard/admin" : "/dashboard/teacher";
    const resultsApi = role === "admin" ? "/api/admin/quiz-results" : "/api/teacher/quiz-results";
    const quizzesApi = role === "admin" ? "/api/admin/quizzes" : "/api/teacher/quizzes";

    const [results, setResults] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [quizDetails, setQuizDetails] = useState<any>(null);
    const [filteredResults, setFilteredResults] = useState<QuizResult[]>([]);

    useEffect(() => {
        if (quizId) {
            fetchQuizResults();
            fetchQuizDetails();
        } else {
            toast.error(t("teacher.noQuizSpecified"));
            router.push(`${basePath}/quizzes`);
        }
    }, [quizId]);

    useEffect(() => {
        let filtered = results;

        if (searchTerm) {
            filtered = filtered.filter((result) =>
                result.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                result.user.phoneNumber.includes(searchTerm)
            );
        }

        setFilteredResults(filtered);
    }, [results, searchTerm]);

    const fetchQuizResults = async () => {
        try {
            const response = await fetch(`${resultsApi}?quizId=${quizId}`);
            if (response.ok) {
                const data = await response.json();
                setResults(data);
            } else {
                toast.error(t("teacher.errorLoadingResults"));
            }
        } catch (error) {
            console.error("Error fetching quiz results:", error);
            toast.error(t("teacher.errorLoadingResults"));
        } finally {
            setLoading(false);
        }
    };

    const fetchQuizDetails = async () => {
        try {
            const response = await fetch(`${quizzesApi}/${quizId}`);
            if (response.ok) {
                const data = await response.json();
                setQuizDetails(data);
            }
        } catch (error) {
            console.error("Error fetching quiz details:", error);
        }
    };

    const handleViewDetails = (result: QuizResult) => {
        router.push(`${basePath}/quiz-results/${result.id}`);
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

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t("teacher.loading")}</div>
            </div>
        );
    }

    if (!quizId) {
        return (
            <div className="p-6">
                <div className="text-center">{t("teacher.quizNotSpecified")}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`${basePath}/quizzes`)}
                    >
                        <ArrowLeft className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                        {t("teacher.back")}
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t("teacher.quizResultsTitle")}: {quizDetails?.title || t("teacher.loading")}
                    </h1>
                </div>
            </div>

            {quizDetails && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("teacher.quizInfo")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <h4 className="font-medium mb-1">{t("teacher.quizTitle")}</h4>
                                <p className="text-sm text-muted-foreground">{quizDetails.title}</p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-1">{t("teacher.course")}</h4>
                                <p className="text-sm text-muted-foreground">{quizDetails.course?.title}</p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-1">{t("teacher.numberOfQuestions")}</h4>
                                <Badge variant="secondary">
                                    {quizDetails.questions?.length || 0} {t("teacher.question")}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t("teacher.totalResults")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{results.length}</div>
                        <p className="text-xs text-muted-foreground">{t("teacher.result")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t("teacher.averageGrades") || t("admin.averageGrades")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {results.length > 0
                                ? Math.round(results.reduce((sum, r) => sum + calculatePercentage(r.score, r.totalPoints), 0) / results.length)
                                : 0
                            }%
                        </div>
                        <p className="text-xs text-muted-foreground">{t("teacher.average")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t("teacher.highestGrade") || t("admin.highestGrade")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {results.length > 0
                                ? Math.max(...results.map((r) => calculatePercentage(r.score, r.totalPoints)))
                                : 0
                            }%
                        </div>
                        <p className="text-xs text-muted-foreground">{t("teacher.bestResult")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t("teacher.needsGrading")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {results.filter((result) => countPendingWrittenAnswers(result.answers) > 0).length}
                        </div>
                        <p className="text-xs text-muted-foreground">{t("teacher.pendingReview")}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("teacher.studentResults")}</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("teacher.searchInStudents")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t("teacher.student")}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t("teacher.grade")}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t("teacher.percentage")}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t("teacher.evaluation")}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t("teacher.submissionDate")}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t("teacher.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredResults.map((result) => {
                                const percentage = calculatePercentage(result.score, result.totalPoints);
                                const grade = getGradeBadge(percentage);
                                const pendingCount = countPendingWrittenAnswers(result.answers);

                                return (
                                    <TableRow key={result.id}>
                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                            <div>
                                                <div>{result.user.fullName}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {result.user.phoneNumber}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <div className="font-medium">
                                                {result.score} / {result.totalPoints}
                                            </div>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <div className={`font-medium ${getGradeColor(percentage)}`}>
                                                {percentage}%
                                            </div>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {pendingCount > 0 ? (
                                                <Badge variant="outline" className="border-amber-500 text-amber-700">
                                                    {t("teacher.needsGrading")} ({pendingCount})
                                                </Badge>
                                            ) : (
                                                <Badge variant={grade.variant}>
                                                    {grade.text}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <div className="text-sm text-muted-foreground">
                                                {new Date(result.submittedAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US")}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(result.submittedAt).toLocaleTimeString(isRTL ? "ar-EG" : "en-US")}
                                            </div>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleViewDetails(result)}
                                            >
                                                <Eye className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                                                {t("teacher.details")}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    {filteredResults.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">{t("teacher.noResultsToDisplay")}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export const QuizResultsList = ({ role }: QuizResultsListProps) => {
    const { t } = useLanguage();

    return (
        <Suspense fallback={
            <div className="p-6">
                <div className="text-center">{t("teacher.loading")}</div>
            </div>
        }>
            <QuizResultsListContent role={role} />
        </Suspense>
    );
};
