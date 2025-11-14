"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Search, Eye, Award, TrendingUp, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";
import { useSession } from "next-auth/react";

interface Course {
    id: string;
    title: string;
}

interface Quiz {
    id: string;
    title: string;
    courseId: string;
    course: {
        title: string;
    };
    totalPoints: number;
}

interface QuizResult {
    id: string;
    studentId: string;
    user: {
        fullName: string;
        phoneNumber: string;
    };
    quizId: string;
    quiz: {
        title: string;
        course: {
            id: string;
            title: string;
        };
        totalPoints: number;
    };
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
    answers: QuizAnswer[];
}

interface QuizAnswer {
    questionId: string;
    question: {
        text: string;
        type: string;
        points: number;
    };
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
}

const GradesPage = () => {
    const { t, isRTL } = useLanguage();
    const { data: session } = useSession();
    
    const [courses, setCourses] = useState<Course[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [selectedQuiz, setSelectedQuiz] = useState<string>("");
    const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/admin/courses/all");
            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const fetchQuizzes = async () => {
        try {
            const response = await fetch("/api/admin/quizzes");
            if (response.ok) {
                const data = await response.json();
                setQuizzes(data);
            }
        } catch (error) {
            console.error("Error fetching quizzes:", error);
        }
    };

    const fetchQuizResults = async () => {
        try {
            const response = await fetch("/api/admin/quiz-results");
            if (response.ok) {
                const data = await response.json();
                setQuizResults(data);
            }
        } catch (error) {
            console.error("Error fetching quiz results:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewResult = (result: QuizResult) => {
        setSelectedResult(result);
        setIsDialogOpen(true);
    };

    useEffect(() => {
        fetchCourses();
        fetchQuizzes();
        fetchQuizResults();
    }, []);
    
    // Check if user is not an admin after all hooks are declared
    if (session?.user?.role !== "ADMIN") {
        return (
            <div className="p-6">
                <div className="text-center">{t('admin.loading')}</div>
            </div>
        );
    }

    const filteredResults = quizResults.filter(result => {
        const matchesSearch = 
            result.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            result.quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            result.quiz.course.title.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCourse = !selectedCourse || selectedCourse === "all" || result.quiz.course.id === selectedCourse;
        const matchesQuiz = !selectedQuiz || selectedQuiz === "all" || result.quizId === selectedQuiz;
        
        return matchesSearch && matchesCourse && matchesQuiz;
    });

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return "text-green-600";
        if (percentage >= 80) return "text-orange-600";
        if (percentage >= 70) return "text-yellow-600";
        if (percentage >= 60) return "text-orange-600";
        return "text-red-600";
    };

    const getGradeBadge = (percentage: number) => {
        if (percentage >= 90) return { variant: "default" as const, className: "bg-green-600 text-white" };
        if (percentage >= 80) return { variant: "default" as const, className: "bg-orange-600 text-white" };
        if (percentage >= 70) return { variant: "default" as const, className: "bg-yellow-600 text-white" };
        if (percentage >= 60) return { variant: "default" as const, className: "bg-orange-600 text-white" };
        return { variant: "destructive" as const, className: "" };
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t('admin.loading')}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('admin.studentGrades') || t('teacher.studentGrades')}
                </h1>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Users className="h-8 w-8 text-[#090919]" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('admin.totalStudents') || t('teacher.totalStudents')}</p>
                                <p className="text-2xl font-bold">
                                    {new Set(quizResults.map(r => r.studentId)).size}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Award className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('admin.averageGrades') || t('teacher.averageGrades')}</p>
                                <p className="text-2xl font-bold">
                                    {quizResults.length > 0 
                                        ? Math.round(quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length)
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="h-8 w-8 text-purple-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('admin.highestGrade') || t('teacher.highestGrade')}</p>
                                <p className="text-2xl font-bold">
                                    {quizResults.length > 0 
                                        ? Math.max(...quizResults.map(r => r.percentage))
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <FileText className="h-8 w-8 text-orange-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('admin.totalTests') || t('teacher.totalTests')}</p>
                                <p className="text-2xl font-bold">{quizResults.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.searchFilters') || t('teacher.searchFilters')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('admin.search') || t('teacher.search')}</label>
                            <div className="flex items-center space-x-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('admin.searchInStudents') || t('teacher.searchInStudents')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('admin.course') || t('teacher.course')}</label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('admin.allCourses') || t('teacher.allCourses')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('admin.allCourses') || t('teacher.allCourses')}</SelectItem>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('admin.quiz') || t('teacher.quiz')}</label>
                            <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('admin.allQuizzes') || t('teacher.allQuizzes')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('admin.allQuizzes') || t('teacher.allQuizzes')}</SelectItem>
                                    {quizzes.map((quiz) => (
                                        <SelectItem key={quiz.id} value={quiz.id}>
                                            {quiz.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.quizResults') || t('teacher.quizResults')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.student') || t('teacher.student')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.test') || t('teacher.test')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.course') || t('teacher.course')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.grade') || t('teacher.grade')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.percentage') || t('teacher.percentage')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.submissionDate') || t('teacher.submissionDate')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                        <TableBody>
                            {filteredResults.map((result) => {
                                const gradeBadge = getGradeBadge(result.percentage);
                                return (
                                    <TableRow key={result.id}>
                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                            {result.user.fullName}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {result.quiz.title}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant="outline">
                                                {result.quiz.course.title}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <span className="font-bold">
                                                {result.score}/{result.totalPoints}
                                            </span>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge {...gradeBadge}>
                                                {result.percentage}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {format(new Date(result.submittedAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleViewResult(result)}
                                            >
                                                <Eye className="h-4 w-4" />
                                                {t('admin.viewDetails') || t('teacher.viewDetails')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Result Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('admin.details') || t('teacher.details')} {selectedResult?.user.fullName}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedResult && (
                        <div className="space-y-6">
                            {/* Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('admin.quizResults') || t('teacher.quizResults')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-[#090919]">
                                                {selectedResult.score}/{selectedResult.totalPoints}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t('admin.grade') || t('teacher.grade')}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`text-2xl font-bold ${getGradeColor(selectedResult.percentage)}`}>
                                                {selectedResult.percentage}%
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t('admin.percentage') || t('teacher.percentage')}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {selectedResult.answers.filter(a => a.isCorrect).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t('admin.correctAnswers') || t('teacher.correctAnswers')}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">
                                                {selectedResult.answers.filter(a => !a.isCorrect).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t('admin.incorrectAnswers') || t('teacher.incorrectAnswers')}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium">{t('admin.overallProgress') || t('teacher.overallProgress')}</span>
                                            <span className="text-sm font-medium">{selectedResult.percentage}%</span>
                                        </div>
                                        <Progress value={selectedResult.percentage} className="w-full" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Detailed Answers */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('admin.answerDetails') || t('teacher.answerDetails')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {selectedResult.answers.map((answer, index) => (
                                            <div key={answer.questionId} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium">{t('admin.question') || t('teacher.question')} {index + 1}</h4>
                                                    <Badge variant={answer.isCorrect ? "default" : "destructive"}>
                                                        {answer.isCorrect ? (t('admin.correct') || t('teacher.correct')) : (t('admin.incorrect') || t('teacher.incorrect'))}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-2">{answer.question.text}</p>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-medium">{t('admin.studentAnswer') || t('teacher.studentAnswer')}:</span>
                                                        <p className="text-muted-foreground">{answer.studentAnswer}</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">{t('admin.correctAnswer') || t('teacher.correctAnswer')}:</span>
                                                        <p className="text-green-600">{answer.correctAnswer}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-sm">
                                                    <span className="font-medium">{t('admin.points') || t('teacher.points')}:</span>
                                                    <span className="text-muted-foreground">
                                                        {" "}{answer.pointsEarned}/{answer.question.points}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GradesPage;

