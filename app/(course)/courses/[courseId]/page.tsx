"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";

interface CourseContent {
  id: string;
  type: "chapter" | "quiz" | "livestream";
}

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCourse = async () => {
      try {
        setLoading(true);
        const [courseResponse, contentResponse] = await Promise.all([
          axios.get(`/api/courses/${courseId}`),
          axios.get(`/api/courses/${courseId}/content`),
        ]);

        if (cancelled) return;

        setCourseTitle(courseResponse.data.title);

        const content: CourseContent[] = contentResponse.data || [];
        if (content.length === 0) {
          setIsEmpty(true);
          return;
        }

        const first = content[0];
        if (first.type === "chapter") {
          router.replace(`/courses/${courseId}/chapters/${first.id}`);
        } else if (first.type === "quiz") {
          router.replace(`/courses/${courseId}/quizzes/${first.id}`);
        } else {
          router.replace(`/courses/${courseId}/livestreams/${first.id}`);
        }
      } catch (error) {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setNotFound(true);
        } else {
          setIsEmpty(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground">{t("student.loadingCourse")}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">{t("student.courseNotFound")}</h2>
          <Button asChild className="mt-4 bg-[#211FC3] hover:bg-[#211FC3]/90">
            <Link href="/dashboard">{t("student.backToCourses")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center py-16 w-full">
          <div className="bg-muted/50 rounded-2xl p-8 max-w-md mx-auto">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            {courseTitle && (
              <p className="text-sm text-muted-foreground mb-2">{courseTitle}</p>
            )}
            <h3 className="text-lg font-semibold mb-2">
              {t("student.noLessonsYet")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t("student.noLessonsYetDescription")}
            </p>
            <Button asChild className="bg-[#211FC3] hover:bg-[#211FC3]/90 text-white font-semibold">
              <Link href="/dashboard">{t("student.backToCourses")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-muted-foreground">{t("student.loadingCourse")}</p>
      </div>
    </div>
  );
}
