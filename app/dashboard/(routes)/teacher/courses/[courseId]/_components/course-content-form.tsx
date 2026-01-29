"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chapter, Course, Quiz, LiveStream } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { CourseContentList } from "./course-content-list";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/contexts/language-context";

interface CourseContentFormProps {
    initialData: Course & { chapters: Chapter[]; quizzes: Quiz[]; liveStreams: LiveStream[] };
    courseId: string;
}

export const CourseContentForm = ({
    initialData,
    courseId
}: CourseContentFormProps) => {
    const { t } = useLanguage();
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [title, setTitle] = useState("");
    const [isFree, setIsFree] = useState(false);

    const router = useRouter();

    const onCreate = async () => {
        try {
            setIsUpdating(true);
            await axios.post(`/api/courses/${courseId}/chapters`, { title, isFree });
            toast.success(t('teacher.chapterCreatedSuccessfully'));
            setTitle("");
            setIsFree(false);
            setIsCreating(false);
            router.refresh();
        } catch {
            toast.error(t('teacher.errorOccurred'));
        } finally {
            setIsUpdating(false);
        }
    }

    const onDelete = async (id: string, type: "chapter" | "quiz" | "livestream") => {
        try {
            setIsUpdating(true);
            if (type === "chapter") {
                await axios.delete(`/api/courses/${courseId}/chapters/${id}`);
                toast.success(t('teacher.chapterDeletedSuccessfully'));
            } else if (type === "quiz") {
                await axios.delete(`/api/teacher/quizzes/${id}`);
                toast.success(t('teacher.quizDeletedSuccessfully'));
            } else if (type === "livestream") {
                await axios.delete(`/api/teacher/livestreams/${id}`);
                toast.success(t('admin.liveStreamDeletedSuccessfully') || 'Live stream deleted successfully');
            }
            router.refresh();
        } catch {
            toast.error(t('teacher.errorOccurred'));
        } finally {
            setIsUpdating(false);
        }
    }

    const onReorder = async (updateData: { id: string; position: number; type: "chapter" | "quiz" | "livestream" }[]) => {
        try {
            setIsUpdating(true);
            await axios.put(`/api/courses/${courseId}/reorder`, {
                list: updateData
            });
            toast.success(t('teacher.contentReorderedSuccessfully'));
            router.refresh();
        } catch {
            toast.error(t('teacher.errorOccurred'));
        } finally {
            setIsUpdating(false);
        }
    }

    const onEdit = (id: string, type: "chapter" | "quiz" | "livestream") => {
        if (type === "chapter") {
            router.push(`/dashboard/teacher/courses/${courseId}/chapters/${id}`);
        } else if (type === "quiz") {
            router.push(`/dashboard/teacher/quizzes/${id}/edit`);
        } else if (type === "livestream") {
            router.push(`/dashboard/teacher/livestreams/${id}`);
        }
    }

    // Combine chapters, quizzes, and livestreams for display
    const courseItems = [
        ...initialData.chapters.map(chapter => ({
            id: chapter.id,
            title: chapter.title,
            position: chapter.position,
            isPublished: chapter.isPublished,
            type: "chapter" as const,
            isFree: chapter.isFree
        })),
        ...initialData.quizzes.map(quiz => ({
            id: quiz.id,
            title: quiz.title,
            position: quiz.position,
            isPublished: quiz.isPublished,
            type: "quiz" as const
        })),
        ...initialData.liveStreams.map(livestream => ({
            id: livestream.id,
            title: livestream.title,
            position: livestream.position,
            isPublished: livestream.isPublished,
            type: "livestream" as const
        }))
    ].sort((a, b) => a.position - b.position);

    return (
        <div className="relative mt-6 border bg-card rounded-md p-3 sm:p-4 flex flex-col min-h-[200px]">
            {isUpdating && (
                <div className="absolute h-full w-full bg-background/50 top-0 right-0 rounded-m flex items-center justify-center z-10">
                    <div className="animate-spin h-6 w-6 border-4 border-primary rounded-full border-t-transparent" />
                </div>
            )}
            <div className="font-medium mb-4">
                <span className="text-sm sm:text-base">{t('teacher.courseContent')}</span>
            </div>
            
            {isCreating && (
                <div className="flex-1 space-y-4 mb-4">
                    <Input
                        disabled={isUpdating}
                        placeholder={t('teacher.chapterTitlePlaceholder')}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    {!initialData.isFree && (
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isFree"
                                checked={isFree}
                                onChange={(e) => setIsFree(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="isFree" className="text-sm font-medium">
                                {t('teacher.makeChapterFree')}
                            </label>
                        </div>
                    )}
                    <Button
                        onClick={onCreate}
                        disabled={!title || isUpdating}
                        type="button"
                    >
                        {t('teacher.create')}
                    </Button>
                </div>
            )}
            
            {!isCreating && (
                <div className={cn(
                    "flex-1 text-sm",
                    !courseItems.length && "text-muted-foreground italic"
                )}>
                    {!courseItems.length && (
                        <p className="py-8 text-center">{t('teacher.noContent')}</p>
                    )}
                    {courseItems.length > 0 && (
                        <>
                            <CourseContentList
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onReorder={onReorder}
                                items={courseItems}
                            />
                            <p className="text-xs text-muted-foreground mt-4 text-center">
                                {t('teacher.dragAndDropToReorder')}
                            </p>
                        </>
                    )}
                </div>
            )}
            
            <div className="flex flex-row gap-2 mt-4 pt-4 border-t flex-wrap">
                <Button 
                    onClick={() => router.push(`/dashboard/teacher/quizzes/create?courseId=${courseId}`)} 
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-center min-w-[120px]"
                >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {t('teacher.addQuiz')}
                </Button>
                <Button 
                    onClick={() => setIsCreating((current) => !current)} 
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-center min-w-[120px]"
                >
                    {isCreating ? (
                        <>{t('common.cancel')}</>
                    ) : (
                        <>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            {t('teacher.addChapter')}
                        </>
                    )}
                </Button>
                <Button 
                    onClick={() => router.push(`/dashboard/teacher/livestreams/create?courseId=${courseId}`)} 
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-center min-w-[120px]"
                >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {t('admin.createLiveStream') || 'إنشاء بث مباشر'}
                </Button>
            </div>
        </div>
    );
}; 