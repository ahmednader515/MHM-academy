import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SearchInput } from "./_components/search-input";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Course, Purchase } from "@prisma/client";
import { SearchPageContent } from "./_components/search-page-content";

type CourseWithDetails = Course & {
    chapters: { id: string }[];
    purchases: Purchase[];
    progress: number;
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await auth();

    if (!session?.user?.id) {
        return redirect("/");
    }

    const resolvedParams = await searchParams;
    const title = typeof resolvedParams.title === 'string' ? resolvedParams.title : '';

    // Get user information to filter courses based on their curriculum, level and grade
    const user = await db.user.findUnique({
        where: {
            id: session.user.id,
        },
        select: {
            curriculum: true,
            curriculumType: true,
            level: true,
            language: true,
            grade: true,
        },
    });

    // Build the where clause for course filtering
    const whereClause: any = {
        isPublished: true,
        title: {
            contains: title,
        }
    };

    // Add curriculum, level, language and grade filtering if user has this information
    if (user?.curriculum || user?.level || user?.language || user?.grade) {
        whereClause.OR = [];
        
        // Add courses with no targeting (available to all)
        whereClause.OR.push({
            AND: [
                { targetCurriculum: null },
                { targetLevel: null },
                { targetLanguage: null },
                { targetGrade: null }
            ]
        });
        
        // Helper function to add curriculumType filter for Egyptian curriculum
        const addCurriculumTypeCondition = (conditions: any[]) => {
            // For Egyptian curriculum, filter by curriculumType
            if (user.curriculum === 'egyptian' && user.curriculumType) {
                // Include courses that either don't have curriculumType (backward compatibility)
                // or match the user's curriculumType
                conditions.push({
                    OR: [
                        { targetCurriculumType: null },
                        { targetCurriculumType: user.curriculumType }
                    ]
                });
            }
            return conditions;
        };
        
        // Add courses that match user's curriculum only (any level, any language, any grade)
        if (user.curriculum) {
            const conditions: any[] = [
                    { targetCurriculum: user.curriculum },
                    { targetLevel: null },
                    { targetLanguage: null },
                    { targetGrade: null }
            ];
            addCurriculumTypeCondition(conditions);
            whereClause.OR.push({ AND: conditions });
        }
        
        // Add courses that match user's curriculum and level (any language, any grade)
        if (user.curriculum && user.level) {
            const conditions: any[] = [
                    { targetCurriculum: user.curriculum },
                    { targetLevel: user.level },
                    { targetLanguage: null },
                    { targetGrade: null }
            ];
            addCurriculumTypeCondition(conditions);
            whereClause.OR.push({ AND: conditions });
        }
        
        // Add courses that match user's curriculum, level and language (any grade)
        if (user.curriculum && user.level && user.language) {
            const conditions: any[] = [
                    { targetCurriculum: user.curriculum },
                    { targetLevel: user.level },
                    { targetLanguage: user.language },
                    { targetGrade: null }
            ];
            addCurriculumTypeCondition(conditions);
            whereClause.OR.push({ AND: conditions });
        }
        
        // Add courses that match user's curriculum, level, language and grade exactly
        if (user.curriculum && user.level && user.language && user.grade) {
            const conditions: any[] = [
                    { targetCurriculum: user.curriculum },
                    { targetLevel: user.level },
                    { targetLanguage: user.language },
                    { targetGrade: user.grade }
            ];
            addCurriculumTypeCondition(conditions);
            whereClause.OR.push({ AND: conditions });
        }
        
        // Add courses that are more general but still match user's curriculum
        // This handles cases where courses have partial targeting
        if (user.curriculum) {
            // Courses that match curriculum and level but have any language/grade
            if (user.level) {
                const conditions: any[] = [
                        { targetCurriculum: user.curriculum },
                        { targetLevel: user.level }
                ];
                addCurriculumTypeCondition(conditions);
                whereClause.OR.push({ AND: conditions });
            }
            
            // Courses that match curriculum and language but have any level/grade
            if (user.language) {
                const conditions: any[] = [
                        { targetCurriculum: user.curriculum },
                        { targetLanguage: user.language }
                ];
                addCurriculumTypeCondition(conditions);
                whereClause.OR.push({ AND: conditions });
            }
            
            // Courses that match curriculum and grade but have any level/language
            if (user.grade) {
                const conditions: any[] = [
                        { targetCurriculum: user.curriculum },
                        { targetGrade: user.grade }
                ];
                addCurriculumTypeCondition(conditions);
                whereClause.OR.push({ AND: conditions });
            }
        }
    }

    const courses = await db.course.findMany({
        where: whereClause,
        include: {
            chapters: {
                where: {
                    isPublished: true,
                },
                select: {
                    id: true,
                }
            },
            purchases: {
                where: {
                    userId: session.user.id,
                }
            }
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    // Batch all progress queries to avoid N+1 problem
    const allChapterIds = courses.flatMap(course => course.chapters.map(chapter => chapter.id));
    
    const allCompletedChapters = await db.userProgress.findMany({
        where: {
            userId: session.user.id,
            chapterId: {
                in: allChapterIds
            },
            isCompleted: true
        },
        select: {
            chapterId: true
        },
    });

    const completedChapterIds = new Set(allCompletedChapters.map(progress => progress.chapterId));

    // Calculate progress for each course using the batched data
    const coursesWithProgress = courses.map((course) => {
        const totalChapters = course.chapters.length;
        const completedChapters = course.chapters.filter(chapter => 
            completedChapterIds.has(chapter.id)
        ).length;

        const progress = totalChapters > 0 
            ? (completedChapters / totalChapters) * 100 
            : 0;

        return {
            ...course,
            progress
        } as CourseWithDetails;
    });

    return (
        <SearchPageContent 
            coursesWithProgress={coursesWithProgress}
            title={title}
        />
    );
}