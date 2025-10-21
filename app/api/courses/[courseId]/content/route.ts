import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;

        // Get chapters
        const chapters = await db.chapter.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                userProgress: {
                    select: {
                        isCompleted: true
                    }
                }
            },
            orderBy: {
                position: "asc"
            }
        });

        // Get published quizzes
        const quizzes = await db.quiz.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                quizResults: {
                    select: {
                        id: true,
                        score: true,
                        totalPoints: true,
                        percentage: true
                    }
                }
            },
            orderBy: {
                position: "asc"
            }
        });

        // Get published live streams
        const liveStreams = await db.liveStream.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            orderBy: {
                createdAt: "asc"
            }
        });

        // Combine and sort by position
        const allContent = [
            ...chapters.map(chapter => ({
                ...chapter,
                type: 'chapter' as const
            })),
            ...quizzes.map(quiz => ({
                ...quiz,
                type: 'quiz' as const
            })),
            ...liveStreams.map(liveStream => ({
                ...liveStream,
                type: 'livestream' as const,
                position: 999 // Live streams appear at the end
            }))
        ].sort((a, b) => a.position - b.position);

        return NextResponse.json(allContent);
    } catch (error) {
        console.log("[COURSE_CONTENT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 