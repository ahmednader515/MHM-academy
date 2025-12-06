"use client";

import { SearchInput } from "./search-input";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CourseWithDetails = {
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    price?: number | null;
    isPublished: boolean;
    targetCurriculum?: string | null;
    targetLevel?: string | null;
    targetLanguage?: string | null;
    targetGrade?: string | null;
    createdAt: Date;
    updatedAt: Date;
    chapters: { id: string }[];
    purchases: { id: string; userId: string; courseId: string; status: string; createdAt: Date; updatedAt: Date; }[];
    progress: number;
};

interface SearchPageContentProps {
    coursesWithProgress: CourseWithDetails[];
    title: string;
}

export const SearchPageContent = ({ coursesWithProgress, title }: SearchPageContentProps) => {
    const { t } = useLanguage();
    const { formatPrice } = useCurrency();
    const router = useRouter();

    const handleEnrollInFreeCourse = async (courseId: string) => {
        try {
            const response = await fetch(`/api/courses/${courseId}/enroll`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                toast.success(t('dashboard.enrolledSuccessfully'));
                router.refresh();
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || t('dashboard.enrollmentFailed'));
            }
        } catch (error) {
            console.error('Error enrolling in course:', error);
            toast.error(t('dashboard.enrollmentFailed'));
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{t('dashboard.searchCourses')}</h1>
                <p className="text-muted-foreground text-lg">
                    {title 
                        ? `${t('dashboard.searchResults')} "${title}"`
                        : t('dashboard.discoverVariety')
                    }
                </p>
            </div>

            {/* Search Input Section */}
            <div className="bg-card rounded-2xl p-6 border shadow-sm">
                <div className="max-w-2xl mx-auto">
                    <SearchInput />
                </div>
            </div>

            {/* Results Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">
                        {title 
                            ? t('dashboard.searchResultsCount', { count: coursesWithProgress.length })
                            : t('dashboard.allCourses', { count: coursesWithProgress.length })
                        }
                    </h2>
                    {coursesWithProgress.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                            {t('dashboard.coursesAvailable', { count: coursesWithProgress.length })}
                        </div>
                    )}
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {coursesWithProgress.map((course) => (
                        <div
                            key={course.id}
                            className="group bg-card rounded-2xl overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                        >
                            <div className="relative w-full aspect-[16/9]">
                                <Image
                                    src={course.imageUrl || "/placeholder.png"}
                                    alt={course.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                
                                {/* Course Status Badge */}
                                <div className="absolute top-4 right-4">
                                    <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                                        course.purchases.length > 0 
                                            ? "bg-green-500 text-white" 
                                            : "bg-white/90 backdrop-blur-sm text-gray-800"
                                    }`}>
                                        {course.purchases.length > 0 ? t('dashboard.subscribed') : t('dashboard.available')}
                                    </div>
                                </div>

                                {/* Price Badge */}
                                <div className="absolute top-4 left-4">
                                    <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                                        course.isFree 
                                            ? "bg-green-500 text-white" 
                                            : "bg-white/90 backdrop-blur-sm text-gray-800"
                                    }`}>
                                        {course.isFree ? t('dashboard.free') : formatPrice(course.price || 0)}
                                    </div>
                                </div>

                                {/* Target Audience Badges */}
                                {(course.targetFaculty || course.targetLevel) && (
                                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                                        {course.targetFaculty && (
                                            <div className="bg-blue-500/90 backdrop-blur-sm text-white rounded-full px-2 py-1 text-xs font-medium">
                                                {course.targetFaculty}
                                            </div>
                                        )}
                                        {course.targetLevel && (
                                            <div className="bg-purple-500/90 backdrop-blur-sm text-white rounded-full px-2 py-1 text-xs font-medium">
                                                {course.targetLevel}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-6">
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold mb-3 line-clamp-2 min-h-[3rem] text-gray-900">
                                        {course.title}
                                    </h3>
                                    
                                    {/* Target Audience Info */}
                                    {(course.targetCurriculum || course.targetLevel || course.targetLanguage || course.targetGrade) && (
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            {course.targetCurriculum && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {course.targetCurriculum === 'egyptian' ? 'المنهج المصري' : 
                                                     course.targetCurriculum === 'saudi' ? 'المنهج السعودي' :
                                                     course.targetCurriculum === 'summer_courses' ? 'الكورسات الصيفية' :
                                                     course.targetCurriculum === 'center_mhm_academy' ? 'Center MHM Academy' :
                                                     course.targetCurriculum}
                                                </span>
                                            )}
                                            {course.targetLevel && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    {course.targetLevel}
                                                </span>
                                            )}
                                            {course.targetLanguage && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                    {course.targetLanguage === 'arabic' ? 'عربي' : 'لغات'}
                                                </span>
                                            )}
                                            {course.targetGrade && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {course.targetGrade}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Course Stats */}
                                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                        <div className="flex items-center gap-1">
                                            <BookOpen className="h-4 w-4" />
                                            <span className="whitespace-nowrap">
                                                {course.chapters.length} {course.chapters.length === 1 ? t('home.chapter') : t('home.chapters')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            <span className="whitespace-nowrap">{course.purchases.length} {t('dashboard.students')}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            <span className="whitespace-nowrap">{new Date(course.updatedAt).toLocaleDateString('ar', {
                                                year: 'numeric',
                                                month: 'short'
                                            })}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {course.purchases.length > 0 ? (
                                    <Button 
                                        className="w-full bg-[#090919] hover:bg-[#090919]/90 text-white font-semibold py-3 text-base transition-all duration-200 hover:scale-105" 
                                        variant="default"
                                        asChild
                                    >
                                        <Link href={course.chapters.length > 0 ? `/courses/${course.id}/chapters/${course.chapters[0].id}` : `/courses/${course.id}`}>
                                            {t('dashboard.continueLearning')}
                                        </Link>
                                    </Button>
                                ) : course.isFree ? (
                                    <Button 
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-base transition-all duration-200 hover:scale-105" 
                                        variant="default"
                                        onClick={() => handleEnrollInFreeCourse(course.id)}
                                    >
                                        {t('dashboard.enrollInFreeCourse')}
                                    </Button>
                                ) : (
                                    <Button 
                                        className="w-full bg-[#090919] hover:bg-[#090919]/90 text-white font-semibold py-3 text-base transition-all duration-200 hover:scale-105" 
                                        variant="default"
                                        asChild
                                    >
                                        <Link href={`/courses/${course.id}/purchase`}>
                                            {t('dashboard.viewCourse')}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {coursesWithProgress.length === 0 && (
                    <div className="text-center py-16">
                        <div className="bg-muted/50 rounded-2xl p-8 max-w-md mx-auto">
                            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                {title ? t('dashboard.noCoursesFound') : t('dashboard.noCoursesAvailable')}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {title 
                                    ? t('dashboard.tryDifferentSearch')
                                    : t('dashboard.newCoursesSoon')
                                }
                            </p>
                            {title && (
                                <Button asChild className="bg-[#211FC3] hover:bg-[#211FC3]/90 text-white font-semibold">
                                    <Link href="/dashboard/search">
                                        {t('dashboard.viewAllCourses')}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
