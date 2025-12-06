"use client"

import { Chapter } from "@prisma/client";
import { ChapterForm } from "./chapter-form";
import { VideoForm } from "./video-form";
import { AttachmentsForm } from "./attachments-form";
import Link from "next/link";
import { ArrowLeft, Video, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/icon-badge";
import { useLanguage } from "@/lib/contexts/language-context";

interface ChapterPageContentProps {
    chapter: Chapter & {
        attachments: any[];
    };
    courseId: string;
    chapterId: string;
    completionText: string;
    courseIsFree?: boolean;
}

export const ChapterPageContent = ({
    chapter,
    courseId,
    chapterId,
    completionText,
    courseIsFree = false
}: ChapterPageContentProps) => {
    const { t } = useLanguage();

    return (
        <div className="p-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-y-2">
                    <Link href={`/dashboard/teacher/courses/${courseId}`}>
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('teacher.backToCourseSettings')}
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-medium">
                        {t('teacher.chapterSettings')}
                    </h1>
                    <span className="text-sm text-muted-foreground">
                        {t('teacher.completeAllFields')} {completionText}
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                <div>
                    <ChapterForm
                        initialData={chapter}
                        courseId={courseId}
                        chapterId={chapterId}
                        courseIsFree={courseIsFree}
                    />
                </div>
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-x-2">
                            <IconBadge icon={Video} />
                            <h2 className="text-xl">
                                {t('teacher.addVideo')}
                            </h2>
                        </div>
                        <VideoForm
                            initialData={chapter}
                            courseId={courseId}
                            chapterId={chapterId}
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-x-2">
                            <IconBadge icon={Files} />
                            <h2 className="text-xl">
                                {t('teacher.chapterDocuments')}
                            </h2>
                        </div>
                        <AttachmentsForm
                            initialData={chapter}
                            courseId={courseId}
                            chapterId={chapterId}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
