"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye } from "lucide-react";
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
  course: { id: string; title: string };
  questions: { id: string }[];
  createdAt: string;
}

export default function AdminQuizzesPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchQuizzes = async () => {
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
    };
    fetchQuizzes();
  }, []);

  const filteredQuizzes = quizzes.filter((quiz) =>
    [quiz.title, quiz.course.title].some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
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
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.course')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.position')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.status')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.numberOfQuestions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuizzes.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>{quiz.title}</TableCell>
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
                    <Badge variant="secondary">{quiz.questions.length} {t('dashboard.question')}</Badge>
                  </TableCell>
                  
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


