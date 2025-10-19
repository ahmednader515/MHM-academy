"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AdminCoursesTable } from "./admin-courses-table";
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
};

interface AdminCoursesContentProps {
    courses: Course[];
}

export const AdminCoursesContent = ({ courses }: AdminCoursesContentProps) => {
    const { t } = useLanguage();

    return (
        <div className="p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('dashboard.allCourses')}</h1>
                <Link href="/dashboard/admin/courses/create">
                    <Button className="bg-[#211FC3] hover:bg-[#211FC3]/90 text-white">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        {t('dashboard.createNewCourse')}
                    </Button>
                </Link>
            </div>

            <div className="mt-6">
                <AdminCoursesTable courses={courses as any} />
            </div>
        </div>
    );
};
