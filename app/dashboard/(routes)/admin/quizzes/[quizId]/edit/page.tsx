"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { UploadDropzone } from "@/lib/uploadthing";
import { useLanguage } from "@/lib/contexts/language-context";

interface Course {
    id: string;
    title: string;
    isPublished: boolean;
}

interface Chapter {
    id: string;
    title: string;
    position: number;
    isPublished: boolean;
}

interface Quiz {
    id: string;
    title: string;
    description: string;
    courseId: string;
    position: number;
    isPublished: boolean;
    course: {
        title: string;
    };
    questions: Question[];
    createdAt: string;
    updatedAt: string;
    timer?: number;
    maxAttempts?: number;
}

interface Question {
    id: string;
    text: string;
    imageUrl?: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
    options?: string[];
    correctAnswer: string | number;
    points: number;
}

interface CourseItem {
    id: string;
    title: string;
    type: "chapter" | "quiz";
    position: number;
    isPublished: boolean;
}

const EditQuizPage = () => {
    const router = useRouter();
    const params = useParams();
    const { t } = useLanguage();
    const quizId = params.quizId as string;
    
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [quizTitle, setQuizTitle] = useState("");
    const [quizDescription, setQuizDescription] = useState("");
    const [quizTimer, setQuizTimer] = useState<number | null>(null);
    const [quizMaxAttempts, setQuizMaxAttempts] = useState<number>(1);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedPosition, setSelectedPosition] = useState<number>(1);
    const [courseItems, setCourseItems] = useState<CourseItem[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [isLoadingCourseItems, setIsLoadingCourseItems] = useState(false);
    const [isUpdatingQuiz, setIsUpdatingQuiz] = useState(false);
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(true);
    const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        fetchCourses();
        fetchQuiz();
    }, [quizId]);

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/admin/courses");
            if (response.ok) {
                const data = await response.json();
                const adminCourses = data.filter((course: Course) => course.isPublished);
                setCourses(adminCourses);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const fetchQuiz = async () => {
        try {
            const response = await fetch(`/api/admin/quizzes/${quizId}`);
            if (response.ok) {
                const quiz: Quiz = await response.json();
                setQuizTitle(quiz.title);
                setQuizDescription(quiz.description);
                setQuizTimer(quiz.timer || null);
                setQuizMaxAttempts(quiz.maxAttempts || 1);
                setSelectedCourse(quiz.courseId);
                
                const processedQuestions = quiz.questions.map(question => {
                    if (question.type === "MULTIPLE_CHOICE" && question.options) {
                        const validOptions = question.options.filter(option => option.trim() !== "");
                        const correctAnswerIndex = validOptions.findIndex(option => option === question.correctAnswer);
                        return {
                            ...question,
                            correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0
                        };
                    }
                    return question;
                });
                
                setQuestions(processedQuestions);
                setSelectedPosition(quiz.position);
                await fetchCourseItems(quiz.courseId);
            } else {
                toast.error(t('quiz.errorLoadingQuiz'));
                router.push("/dashboard/admin/quizzes");
            }
        } catch (error) {
            console.error("Error fetching quiz:", error);
            toast.error(t('quiz.errorLoadingQuiz'));
            router.push("/dashboard/admin/quizzes");
        } finally {
            setIsLoadingQuiz(false);
        }
    };

    const fetchCourseItems = async (courseId: string) => {
        try {
            setIsLoadingCourseItems(true);
            setCourseItems([]);
            
            const [chaptersResponse, quizzesResponse] = await Promise.all([
                fetch(`/api/courses/${courseId}/chapters`),
                fetch(`/api/courses/${courseId}/quizzes`)
            ]);
            
            const chaptersData = chaptersResponse.ok ? await chaptersResponse.json() : [];
            const quizzesData = quizzesResponse.ok ? await quizzesResponse.json() : [];
            
            const items: CourseItem[] = [
                ...chaptersData.map((chapter: Chapter) => ({
                    id: chapter.id,
                    title: chapter.title,
                    type: "chapter" as const,
                    position: chapter.position,
                    isPublished: chapter.isPublished
                })),
                ...quizzesData.map((quiz: Quiz) => ({
                    id: quiz.id,
                    title: quiz.title,
                    type: "quiz" as const,
                    position: quiz.position,
                    isPublished: quiz.isPublished
                }))
            ];
            
            items.sort((a, b) => a.position - b.position);
            
            setCourseItems(items);
            setChapters(chaptersData);
            
            const quizInList = items.find(item => item.id === quizId);
            if (quizInList) {
                setSelectedPosition(quizInList.position);
            }
        } catch (error) {
            console.error("Error fetching course items:", error);
            setCourseItems([]);
        } finally {
            setIsLoadingCourseItems(false);
        }
    };

    const handleUpdateQuiz = async () => {
        if (!selectedCourse || !quizTitle.trim()) {
            toast.error(t('quiz.pleaseEnterAllRequiredData'));
            return;
        }

        const validationErrors: string[] = [];

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            if (!question.text || question.text.trim() === "") {
                validationErrors.push(`${t('quiz.questionNumber')} ${i + 1}: ${t('quiz.questionRequired')}`);
                continue;
            }

            if (question.type === "MULTIPLE_CHOICE") {
                const validOptions = question.options?.filter(option => option.trim() !== "") || [];
                if (validOptions.length === 0) {
                    validationErrors.push(`${t('quiz.questionNumber')} ${i + 1}: ${t('quiz.addAtLeastOneOption')}`);
                    continue;
                }
                
                if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer >= validOptions.length) {
                    validationErrors.push(`${t('quiz.questionNumber')} ${i + 1}: ${t('quiz.selectCorrectAnswerRequired')}`);
                    continue;
                }
            } else if (question.type === "TRUE_FALSE") {
                if (!question.correctAnswer || (question.correctAnswer !== "true" && question.correctAnswer !== "false")) {
                    validationErrors.push(`${t('quiz.questionNumber')} ${i + 1}: ${t('quiz.selectCorrectAnswerRequired')}`);
                    continue;
                }
            } else if (question.type === "SHORT_ANSWER") {
                if (!question.correctAnswer || question.correctAnswer.toString().trim() === "") {
                    validationErrors.push(`${t('quiz.questionNumber')} ${i + 1}: ${t('quiz.correctAnswerRequired')}`);
                    continue;
                }
            }

            if (question.points <= 0) {
                validationErrors.push(`${t('quiz.questionNumber')} ${i + 1}: ${t('quiz.pointsMustBeGreaterThanZero')}`);
                continue;
            }
        }

        if (validationErrors.length > 0) {
            toast.error(validationErrors.join('\n'));
            return;
        }

        if (questions.length === 0) {
            toast.error(t('quiz.addAtLeastOneQuestion'));
            return;
        }

        const cleanedQuestions = questions.map(question => {
            if (question.type === "MULTIPLE_CHOICE" && question.options) {
                const filteredOptions = question.options.filter(option => option.trim() !== "");
                return {
                    ...question,
                    options: filteredOptions
                };
            }
            return question;
        });

        setIsUpdatingQuiz(true);
        try {
            const response = await fetch(`/api/admin/quizzes/${quizId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: quizTitle,
                    description: quizDescription,
                    courseId: selectedCourse,
                    questions: cleanedQuestions,
                    position: selectedPosition,
                    timer: quizTimer,
                    maxAttempts: quizMaxAttempts,
                }),
            });

            if (response.ok) {
                toast.success(t('quiz.quizUpdatedSuccessfully'));
                router.push("/dashboard/admin/quizzes");
            } else {
                try {
                    const error = await response.json();
                    toast.error(error.error || error.message || t('quiz.errorUpdatingQuiz'));
                } catch (e) {
                    toast.error(t('quiz.errorUpdatingQuiz'));
                }
            }
        } catch (error) {
            console.error("Error updating quiz:", error);
            toast.error(t('quiz.errorUpdatingQuiz'));
        } finally {
            setIsUpdatingQuiz(false);
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: "",
            type: "MULTIPLE_CHOICE",
            options: ["", "", "", ""],
            correctAnswer: 0,
            points: 1,
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
        setQuestions(updatedQuestions);
    };

    const removeQuestion = (index: number) => {
        const updatedQuestions = questions.filter((_, i) => i !== index);
        setQuestions(updatedQuestions);
    };

    const handleDragEnd = async (result: any) => {
        if (!result.destination) return;

        if (result.draggableId === quizId) {
            const newQuizPosition = result.destination.index + 1;
            setSelectedPosition(newQuizPosition);
            
            const reorderedItems = Array.from(courseItems);
            const [movedItem] = reorderedItems.splice(result.source.index, 1);
            reorderedItems.splice(result.destination.index, 0, movedItem);
            
            setCourseItems(reorderedItems);

            const updateData = reorderedItems.map((item, index) => ({
                id: item.id,
                type: item.type,
                position: index + 1,
            }));

            try {
                const response = await fetch(`/api/courses/${selectedCourse}/reorder`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        list: updateData
                    }),
                });

                if (response.ok) {
                    toast.success(t('quiz.quizReorderedSuccessfully'));
                } else {
                    toast.error(t('quiz.errorReorderingQuiz'));
                }
            } catch (error) {
                console.error("Error reordering quiz:", error);
                toast.error(t('quiz.errorReorderingQuiz'));
            }
        }
    };

    if (isLoadingQuiz) {
        return (
            <div className="p-6">
                <div className="text-center">{t('teacher.loading')}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('quiz.editQuiz')}
                </h1>
                <Button variant="outline" onClick={() => router.push("/dashboard/admin/quizzes")}>
                    {t('quiz.backToQuizzes')}
                </Button>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('quiz.selectCourse')}</Label>
                        <Select value={selectedCourse} onValueChange={(value) => {
                            setSelectedCourse(value);
                            setCourseItems([]);
                            if (value) {
                                fetchCourseItems(value);
                            }
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('quiz.selectCoursePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map((course) => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {course.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('quiz.quizTitle')}</Label>
                        <Input
                            value={quizTitle}
                            onChange={(e) => setQuizTitle(e.target.value)}
                            placeholder={t('quiz.enterQuizTitle')}
                        />
                    </div>
                </div>

                {selectedCourse && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('quiz.quizOrderInCourse')}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {t('quiz.dragQuizToDesiredPosition')}
                            </p>
                            <p className="text-sm text-[#090919]">
                                {t('quiz.selectedPosition')}: {selectedPosition}
                            </p>
                        </CardHeader>
                        <CardContent>
                            {isLoadingCourseItems ? (
                                <div className="text-center py-8">
                                    <div className="text-muted-foreground">{t('quiz.loadingCourseContent')}</div>
                                </div>
                            ) : courseItems.length > 0 ? (
                                <DragDropContext onDragEnd={handleDragEnd}>
                                    <Droppable droppableId="course-items">
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="space-y-2"
                                            >
                                                {courseItems.map((item, index) => (
                                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={`p-3 border rounded-lg flex items-center justify-between ${
                                                                    snapshot.isDragging ? "bg-orange-50" : "bg-white"
                                                                } ${item.id === quizId ? "border-2 border-dashed border-orange-300 bg-orange-50" : ""}`}
                                                            >
                                                                <div className="flex items-center space-x-3">
                                                                    <div {...provided.dragHandleProps} className={item.id === quizId ? "cursor-grab active:cursor-grabbing" : ""}>
                                                                        <GripVertical className={`h-4 w-4 ${item.id === quizId ? "text-[#090919]" : "text-gray-300 cursor-not-allowed"}`} />
                                                                    </div>
                                                                    <div>
                                                                        <div className={`font-medium ${item.id === quizId ? "text-orange-800" : ""}`}>
                                                                            {item.title}
                                                                        </div>
                                                                        <div className={`text-sm ${item.id === quizId ? "text-[#090919]" : "text-muted-foreground"}`}>
                                                                            {item.type === "chapter" ? t('teacher.chapter') : t('teacher.quiz')}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Badge variant={item.id === quizId ? "outline" : (item.isPublished ? "default" : "secondary")} className={item.id === quizId ? "border-orange-300 text-orange-700" : ""}>
                                                                    {item.id === quizId ? t('quiz.underEdit') : (item.isPublished ? t('teacher.published') : t('teacher.draft'))}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground mb-4">
                                        {t('quiz.noChaptersOrQuizzes')}
                                    </p>
                                    <div className="p-3 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50">
                                        <div className="flex items-center justify-center space-x-3">
                                            <div>
                                                <div className="font-medium text-orange-800">
                                                    {quizTitle || t('quiz.newQuiz')}
                                                </div>
                                                <div className="text-sm text-[#090919]">{t('teacher.quiz')}</div>
                                            </div>
                                            <Badge variant="outline" className="border-orange-300 text-orange-700">
                                                {t('quiz.underEdit')}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-2">
                    <Label>{t('quiz.quizDescription')}</Label>
                    <Textarea
                        value={quizDescription}
                        onChange={(e) => setQuizDescription(e.target.value)}
                        placeholder={t('quiz.enterQuizDescription')}
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('quiz.quizDuration')}</Label>
                        <Input
                            type="number"
                            value={quizTimer || ""}
                            onChange={(e) => setQuizTimer(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder={t('quiz.leaveEmptyForNoLimit')}
                            min="1"
                        />
                        <p className="text-sm text-muted-foreground">
                            {t('quiz.leaveEmptyForNoDuration')}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('quiz.maxAttemptsAllowed')}</Label>
                        <Input
                            type="number"
                            value={quizMaxAttempts}
                            onChange={(e) => setQuizMaxAttempts(parseInt(e.target.value))}
                            min="1"
                            max="10"
                        />
                        <p className="text-sm text-muted-foreground">
                            {t('quiz.numberOfRetakes')}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>{t('quiz.questions')}</Label>
                        <Button type="button" variant="outline" onClick={addQuestion}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('quiz.addQuestion')}
                        </Button>
                    </div>

                    {questions.map((question, index) => (
                        <Card key={question.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">{t('quiz.questionNumber')} {index + 1}</CardTitle>
                                        {(!question.text.trim() || 
                                            (question.type === "MULTIPLE_CHOICE" && 
                                             (!question.options || question.options.filter(opt => opt.trim() !== "").length === 0)) ||
                                            (question.type === "TRUE_FALSE" && 
                                             (typeof question.correctAnswer !== 'string' || (question.correctAnswer !== "true" && question.correctAnswer !== "false"))) ||
                                            (question.type === "SHORT_ANSWER" && 
                                             (typeof question.correctAnswer !== 'string' || question.correctAnswer.trim() === ""))) && (
                                            <Badge variant="destructive" className="text-xs">
                                                {t('quiz.incomplete')}
                                            </Badge>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeQuestion(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('quiz.questionText')}</Label>
                                    <Textarea
                                        value={question.text}
                                        onChange={(e) => updateQuestion(index, "text", e.target.value)}
                                        placeholder={t('quiz.enterQuestionText')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('quiz.questionImage')}</Label>
                                    <div className="space-y-2">
                                        {question.imageUrl ? (
                                            <div className="relative">
                                                <img 
                                                    src={question.imageUrl} 
                                                    alt="Question" 
                                                    className="max-w-full h-auto max-h-48 rounded-lg border"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    onClick={() => updateQuestion(index, "imageUrl", "")}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                                                <UploadDropzone
                                                    endpoint="courseAttachment"
                                                    onClientUploadComplete={(res) => {
                                                        if (res && res[0]) {
                                                            updateQuestion(index, "imageUrl", res[0].url);
                                                            toast.success(t('quiz.imageUploadedSuccessfully'));
                                                        }
                                                        setUploadingImages(prev => ({ ...prev, [index]: false }));
                                                    }}
                                                    onUploadError={(error: Error) => {
                                                        toast.error(`${t('quiz.errorUploadingImage')}: ${error.message}`);
                                                        setUploadingImages(prev => ({ ...prev, [index]: false }));
                                                    }}
                                                    onUploadBegin={() => {
                                                        setUploadingImages(prev => ({ ...prev, [index]: true }));
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('quiz.questionType')}</Label>
                                        <Select
                                            value={question.type}
                                            onValueChange={(value: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER") =>
                                                updateQuestion(index, "type", value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MULTIPLE_CHOICE">{t('quiz.multipleChoice')}</SelectItem>
                                                <SelectItem value="TRUE_FALSE">{t('quiz.trueFalse')}</SelectItem>
                                                <SelectItem value="SHORT_ANSWER">{t('quiz.shortAnswer')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('quiz.points')}</Label>
                                        <Input
                                            type="number"
                                            value={question.points}
                                            onChange={(e) => updateQuestion(index, "points", parseInt(e.target.value))}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                {question.type === "MULTIPLE_CHOICE" && (
                                    <div className="space-y-2">
                                        <Label>{t('quiz.options')}</Label>
                                        {(question.options || ["", "", "", ""]).map((option, optionIndex) => (
                                            <div key={optionIndex} className="flex items-center space-x-2">
                                                <Input
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...(question.options || ["", "", "", ""])];
                                                        const oldOptionValue = newOptions[optionIndex];
                                                        newOptions[optionIndex] = e.target.value;
                                                        updateQuestion(index, "options", newOptions);
                                                        
                                                        if (question.correctAnswer === oldOptionValue) {
                                                            updateQuestion(index, "correctAnswer", optionIndex);
                                                        }
                                                    }}
                                                    placeholder={`${t('quiz.optionNumber')} ${optionIndex + 1}`}
                                                />
                                                <input
                                                    type="radio"
                                                    name={`correct-${index}`}
                                                    checked={question.correctAnswer === optionIndex}
                                                    onChange={() => updateQuestion(index, "correctAnswer", optionIndex)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {question.type === "TRUE_FALSE" && (
                                    <div className="space-y-2">
                                        <Label>{t('quiz.correctAnswer')}</Label>
                                        <Select
                                            value={typeof question.correctAnswer === 'string' ? question.correctAnswer : ''}
                                            onValueChange={(value) => updateQuestion(index, "correctAnswer", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('quiz.selectCorrectAnswer')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">{t('quiz.true')}</SelectItem>
                                                <SelectItem value="false">{t('quiz.false')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {question.type === "SHORT_ANSWER" && (
                                    <div className="space-y-2">
                                        <Label>{t('quiz.correctAnswer')}</Label>
                                        <Input
                                            value={typeof question.correctAnswer === 'string' ? question.correctAnswer : ''}
                                            onChange={(e) => updateQuestion(index, "correctAnswer", e.target.value)}
                                            placeholder={t('quiz.enterCorrectAnswer')}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-end space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/admin/quizzes")}
                    >
                        {t('quiz.cancel')}
                    </Button>
                    <Button
                        onClick={handleUpdateQuiz}
                        disabled={isUpdatingQuiz || questions.length === 0}
                    >
                        {isUpdatingQuiz ? t('quiz.updating') : t('quiz.updateQuiz')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EditQuizPage;

