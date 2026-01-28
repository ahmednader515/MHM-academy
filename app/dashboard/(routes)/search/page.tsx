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
                { targetGrade: null },
                { targetCurriculumType: null }
            ]
        });
        
        // Build a condition that matches courses where:
        // - Course doesn't specify a field (null) OR course's field matches user's field
        // This ensures courses only show if they match the student's criteria
        const conditions: any[] = [];
        
        // Curriculum: course must either not specify curriculum or match user's curriculum
        if (user?.curriculum) {
            conditions.push({
                OR: [
                    { targetCurriculum: null },
                    { targetCurriculum: user.curriculum }
                ]
            });
        }
        
        // Level: if user has level, course must either not specify level or match user's level
        if (user?.level) {
            conditions.push({
                OR: [
                    { targetLevel: null },
                    { targetLevel: user.level }
                ]
            });
        }
        
        // Language: if user has language, course must either not specify language or match user's language
        // Handle comma-separated languages (multiple selections like "arabic,languages")
        if (user?.language) {
            conditions.push({
                OR: [
                    { targetLanguage: null },
                    { targetLanguage: user.language }, // Exact match for single language
                    // Check if user's language is included in comma-separated targetLanguage
                    // Match if it's in the middle: ",arabic," or ",languages,"
                    {
                        targetLanguage: {
                            contains: `,${user.language},`
                        }
                    },
                    // Match if it starts with the language: "arabic," or "languages,"
                    {
                        targetLanguage: {
                            startsWith: `${user.language},`
                        }
                    },
                    // Match if it ends with the language: ",arabic" or ",languages"
                    {
                        targetLanguage: {
                            endsWith: `,${user.language}`
                        }
                    }
                ]
            });
        }
        
        // Grade: if user has grade, course must either not specify grade or match user's grade
        // Handle comma-separated grades (multiple selections like "p4_arabic,p4_languages")
        // This ensures courses with multiple grades appear for students with any of those grades
        if (user?.grade) {
            conditions.push({
                OR: [
                    { targetGrade: null }, // Course available to all grades
                    { targetGrade: user.grade }, // Exact match for single grade (e.g., course: "p4_arabic", student: "p4_arabic")
                    // Check if user's grade is included in comma-separated targetGrade
                    // Match if it's in the middle: ",p4_arabic," (e.g., course: "p3_arabic,p4_arabic,p5_arabic", student: "p4_arabic")
                    {
                        targetGrade: {
                            contains: `,${user.grade},`
                        }
                    },
                    // Match if it starts with the grade: "p4_arabic," (e.g., course: "p4_arabic,p4_languages", student: "p4_arabic")
                    {
                        targetGrade: {
                            startsWith: `${user.grade},`
                        }
                    },
                    // Match if it ends with the grade: ",p4_arabic" (e.g., course: "p3_arabic,p4_arabic", student: "p4_arabic")
                    {
                        targetGrade: {
                            endsWith: `,${user.grade}`
                        }
                    }
                ]
            });
        }
        
        // CurriculumType: for Egyptian curriculum, must match or be null
        if (user?.curriculum === 'egyptian' && user?.curriculumType) {
            conditions.push({
                OR: [
                    { targetCurriculumType: null },
                    { targetCurriculumType: user.curriculumType }
                ]
            });
        }
        
        if (conditions.length > 0) {
            whereClause.OR.push({ AND: conditions });
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