"use client";

import { IconBadge } from "@/components/icon-badge";
import { LayoutDashboard } from "lucide-react";
import { TitleForm } from "./title-form";
import { DescriptionForm } from "./description-form";
import { ImageForm } from "./image-form";
import { PriceForm } from "./price-form";
import { TargetCollegeForm } from "./target-college-form";
import { CourseContentForm } from "./course-content-form";
import { IsFreeForm } from "./is-free-form";
import { Banner } from "@/components/banner";
import { Actions } from "./actions";
import { useLanguage } from "@/lib/contexts/language-context";

interface Course {
    id: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    price: number | null;
    isPublished: boolean;
    isFree: boolean;
    userId: string;
    chapters: Array<{
        id: string;
        position: number;
        isPublished: boolean;
    }>;
    quizzes: Array<{
        id: string;
        position: number;
    }>;
}

interface CourseEditContentProps {
    course: Course;
    completionText: string;
    isComplete: boolean;
    completionStatus: {
        title: boolean;
        description: boolean;
        imageUrl: boolean;
        price: boolean;
        publishedChapters: boolean;
    };
    isAdmin?: boolean;
}

export const CourseEditContent = ({
    course,
    completionText,
    isComplete,
    completionStatus,
    isAdmin = false
}: CourseEditContentProps) => {
    const { t } = useLanguage();

    return (
        <>
            {!course.isPublished && (
                <Banner
                    variant="warning"
                    label={t('teacher.courseNotPublishedWarning')}
                />
            )}
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-y-2">
                        <h1 className="text-2xl font-medium">
                            {t('teacher.courseSetup')}
                        </h1>
                        <span className="text-sm text-slate-700">
                            {t('teacher.completeAllFields')} {completionText}
                        </span>
                        {!isComplete && (
                            <div className="text-xs text-muted-foreground mt-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className={`flex items-center gap-1 ${completionStatus.title ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.title ? '✓' : '✗'}</span>
                                        <span>{t('teacher.title')}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.description ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.description ? '✓' : '✗'}</span>
                                        <span>{t('teacher.description')}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.imageUrl ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.imageUrl ? '✓' : '✗'}</span>
                                        <span>{t('teacher.image')}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.price ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.price ? '✓' : '✗'}</span>
                                        <span>{t('teacher.price')}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.publishedChapters ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.publishedChapters ? '✓' : '✗'}</span>
                                        <span>{t('teacher.publishedChapter')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <Actions
                        disabled={!isComplete}
                        courseId={course.id}
                        isPublished={course.isPublished}
                        isAdmin={isAdmin}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                    <div>
                        <div className="flex items-center gap-x-2">
                            <IconBadge icon={LayoutDashboard} />
                            <h2 className="text-xl">
                                {t('teacher.customizeYourCourse')}
                            </h2>
                        </div>
                        <TitleForm
                            initialData={course}
                            courseId={course.id}
                            isAdmin={isAdmin}
                        />
                        <DescriptionForm
                            initialData={course}
                            courseId={course.id}
                            isAdmin={isAdmin}
                        />
                        <PriceForm
                            initialData={course}
                            courseId={course.id}
                            isAdmin={isAdmin}
                        />
                        <TargetCollegeForm
                            initialData={course}
                            courseId={course.id}
                            isAdmin={isAdmin}
                        />
                        <IsFreeForm
                            initialData={course}
                            courseId={course.id}
                            isAdmin={isAdmin}
                        />
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-x-2">
                                <IconBadge icon={LayoutDashboard} />
                                <h2 className="text-xl">
                                    {t('teacher.resourcesAndChapters')}
                                </h2>
                            </div>
                            <CourseContentForm
                                initialData={course}
                                courseId={course.id}
                                isAdmin={isAdmin}
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-x-2">
                                <IconBadge icon={LayoutDashboard} />
                                <h2 className="text-xl">
                                    {t('teacher.courseSettings')}
                                </h2>
                            </div>
                            <ImageForm
                                initialData={course}
                                courseId={course.id}
                                isAdmin={isAdmin}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
