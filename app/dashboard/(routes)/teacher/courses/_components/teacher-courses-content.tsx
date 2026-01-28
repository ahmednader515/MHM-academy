"use client";

import { CoursesTable } from "./courses-table";
import { useColumns } from "./columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/lib/contexts/language-context";

type Course = {
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    price: number;
    isPublished: boolean;
    targetFaculty?: string | null;
    targetLevel?: string | null;
    createdAt: Date;
    updatedAt: Date;
    publishedChaptersCount: number;
    publishedQuizzesCount: number;
    enrolledStudentsCount: number;
    user?: {
        id: string;
        fullName: string;
        role: string;
    };
};

interface TeacherCoursesContentProps {
    courses: Course[];
    hasUnpublishedCourses: boolean;
    totalEnrolledStudents: number;
    isAdmin?: boolean;
    basePath?: string;
}

export const TeacherCoursesContent = ({ courses, hasUnpublishedCourses, totalEnrolledStudents, isAdmin = false, basePath }: TeacherCoursesContentProps) => {
    const { t } = useLanguage();
    const columns = useColumns(isAdmin);
    
    // Determine base path for routes
    const routeBasePath = basePath || (isAdmin ? "/dashboard/admin" : "/dashboard/teacher");

    return (
        <div className="p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{isAdmin ? t('dashboard.allCourses') : t('dashboard.myCourses')}</h1>
                <Link href={`${routeBasePath}/courses/create`}>
                    <Button className="bg-[#090919] hover:bg-[#090919]/90 text-white">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        {t('dashboard.createNewCourse')}
                    </Button>
                </Link>
            </div>

            {hasUnpublishedCourses && (
                <Alert className="mt-6 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                        <div className="mb-2">
                            <strong>{t('dashboard.toPublishCourses')}</strong>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>{t('dashboard.addCourseTitle')}</li>
                            <li>{t('dashboard.addCourseDescription')}</li>
                            <li>{t('dashboard.addCourseImage')}</li>
                            <li>{t('dashboard.addOneChapter')}</li>
                            <li>{t('dashboard.clickPublishButton')}</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <div className="mt-6">
                <CoursesTable columns={columns} data={courses} isAdmin={isAdmin} basePath={routeBasePath} />
            </div>
        </div>
    );
};
