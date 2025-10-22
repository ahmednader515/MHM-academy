"use client";

import { CoursesTable } from "./courses-table";
import { useColumns } from "./columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, AlertCircle, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/lib/contexts/language-context";

type Course = {
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    price?: number | null;
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
}

export const TeacherCoursesContent = ({ courses, hasUnpublishedCourses, totalEnrolledStudents, isAdmin = false }: TeacherCoursesContentProps) => {
    const { t } = useLanguage();
    const columns = useColumns(isAdmin);

    return (
        <div className="p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{isAdmin ? t('dashboard.allCourses') : t('dashboard.myCourses')}</h1>
                <Link href={isAdmin ? "/dashboard/admin/courses/create" : "/dashboard/teacher/courses/create"}>
                    <Button className="bg-[#090919] hover:bg-[#090919]/90 text-white">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        {t('dashboard.createNewCourse')}
                    </Button>
                </Link>
            </div>

            {/* Total Enrolled Students Card */}
            <div className="mt-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="flex items-center">
                        <div className="p-3 bg-white/20 rounded-full">
                            <Users className="h-8 w-8" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-semibold">{t('teacher.totalEnrolledStudents')}</h3>
                            <p className="text-3xl font-bold">{totalEnrolledStudents}</p>
                            <p className="text-blue-100 text-sm">{t('teacher.acrossAllCourses')}</p>
                        </div>
                    </div>
                </div>
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
                <CoursesTable columns={columns} data={courses} isAdmin={isAdmin} />
            </div>
        </div>
    );
};
