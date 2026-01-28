"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";

interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  position: number;
  isPublished: boolean;
  course: { 
    id: string; 
    title: string;
    user: {
      id: string;
      fullName: string;
      role: string;
    };
  };
  questions: { id: string }[];
  createdAt: string;
}

export default function SupervisorQuizzesPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const translateWithFallback = useCallback(
    (primaryKey: string, secondaryKey: string, fallback: string) => {
      const primary = t(primaryKey);
      if (primary && primary !== primaryKey) {
        return primary;
      }
      const secondary = t(secondaryKey);
      if (secondary && secondary !== secondaryKey) {
        return secondary;
      }
      return fallback;
    },
    [t]
  );

  const fetchQuizzes = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/quizzes");
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data);
      } else {
        toast.error(t('dashboard.errorLoadingQuizzes'));
      }
    } catch (e) {
      toast.error(t('dashboard.loadingError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleViewQuiz = (quiz: Quiz) => {
    router.push(`/dashboard/supervisor/quizzes/${quiz.id}`);
  };

  const handleEditQuiz = (quiz: Quiz) => {
    router.push(`/dashboard/supervisor/quizzes/${quiz.id}/edit`);
  };

  const handleTogglePublish = async (quiz: Quiz) => {
    setIsToggling(quiz.id);
    try {
      const response = await fetch(`/api/teacher/quizzes/${quiz.id}/publish`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublished: !quiz.isPublished }),
      });

      if (response.ok) {
        toast.success(
          quiz.isPublished
            ? translateWithFallback("quiz.unpublishSuccess", "teacher.unpublishSuccess", "Unpublished successfully")
            : translateWithFallback("quiz.publishSuccess", "teacher.publishSuccess", "Published successfully")
        );
        fetchQuizzes();
      } else {
        toast.error(translateWithFallback("admin.errorOccurred", "teacher.errorOccurred", "An error occurred"));
      }
    } catch (error) {
      toast.error(translateWithFallback("admin.errorOccurred", "teacher.errorOccurred", "An error occurred"));
    } finally {
      setIsToggling(null);
    }
  };

  const handleDeleteQuiz = async (quiz: Quiz) => {
    const confirmMessage = translateWithFallback(
      "admin.deleteQuizConfirm",
      "teacher.deleteQuizConfirm",
      "Are you sure you want to delete this quiz?"
    );

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(quiz.id);
    try {
      const response = await fetch(`/api/admin/quizzes/${quiz.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(
          translateWithFallback("admin.deleteQuizSuccess", "teacher.deleteQuizSuccess", "Quiz deleted successfully")
        );
        fetchQuizzes();
      } else {
        toast.error(
          translateWithFallback("admin.deleteQuizError", "teacher.deleteQuizError", "Failed to delete quiz")
        );
      }
    } catch (error) {
      toast.error(
        translateWithFallback("admin.deleteQuizError", "teacher.deleteQuizError", "Failed to delete quiz")
      );
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredQuizzes = quizzes.filter((quiz) =>
    [quiz.title, quiz.course.title, quiz.course.user.fullName].some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">{t('dashboard.loadingQuizzes')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('dashboard.allQuizzes')}</h1>
        <Button onClick={() => router.push("/dashboard/supervisor/quizzes/create")}>
          <Plus className="h-4 w-4 mr-2" />
          {t('quiz.createNewQuiz')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.quizzes')}</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('dashboard.searchInQuizzes')}
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
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.quizTitle')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.teacherName')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.course')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.position')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.status')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.numberOfQuestions')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuizzes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    {translateWithFallback("admin.noQuizzesFound", "teacher.noQuizzesFound", "No quizzes found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuizzes.map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>{quiz.title}</TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      <div className="flex flex-col">
                        <span className="font-medium">{quiz.course.user.fullName}</span>
                        <span className="text-xs text-muted-foreground capitalize">{quiz.course.user.role}</span>
                      </div>
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      <Badge variant="outline">{quiz.course.title}</Badge>
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      <Badge variant="secondary">{quiz.position}</Badge>
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      <Badge variant={quiz.isPublished ? "default" : "secondary"}>
                        {quiz.isPublished ? t('dashboard.published') : t('dashboard.draft')}
                      </Badge>
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      <Badge variant="secondary">
                        {quiz.questions.length}{" "}
                        {quiz.questions.length === 1
                          ? translateWithFallback("admin.question", "teacher.question", "question")
                          : translateWithFallback("admin.questions", "teacher.questions", "questions")}
                      </Badge>
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      <div className={`flex flex-wrap items-center gap-2 ${isRTL ? "justify-start" : "justify-end"}`}>
                        <Button size="sm" variant="outline" onClick={() => handleViewQuiz(quiz)}>
                          <Eye className="h-4 w-4" />
                          {translateWithFallback("admin.view", "teacher.view", "View")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditQuiz(quiz)}>
                          <Edit className="h-4 w-4" />
                          {translateWithFallback("admin.edit", "teacher.edit", "Edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant={quiz.isPublished ? "destructive" : "default"}
                          onClick={() => handleTogglePublish(quiz)}
                          disabled={isToggling === quiz.id}
                        >
                          {isToggling === quiz.id
                            ? translateWithFallback("common.loading", "teacher.loading", "Loading...")
                            : quiz.isPublished
                              ? translateWithFallback("quiz.unpublish", "teacher.unpublish", "Unpublish")
                              : translateWithFallback("quiz.publish", "teacher.publish", "Publish")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteQuiz(quiz)}
                          disabled={isDeleting === quiz.id}
                        >
                          <Trash2 className="h-4 w-4" />
                          {isDeleting === quiz.id
                            ? translateWithFallback("admin.deleting", "teacher.deleting", "Deleting...")
                            : translateWithFallback("admin.delete", "teacher.delete", "Delete")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

