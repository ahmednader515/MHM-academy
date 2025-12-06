import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;

        // Get chapters, quizzes, and live streams in parallel with caching
        const [chapters, quizzes, liveStreams] = await Promise.all([
            db.chapter.findMany({
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
                },
            }),
            db.quiz.findMany({
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
                },
            }),
            db.liveStream.findMany({
                where: {
                    courseId: resolvedParams.courseId,
                    isPublished: true
                },
                orderBy: {
                    createdAt: "asc"
                },
            })
        ]);

        // Filter out expired livestreams for students
        const now = new Date();
        const activeLiveStreams = liveStreams.filter(stream => {
            if (!stream.scheduledAt || !stream.duration) {
                return true; // Show if no schedule is set
            }
            const endTime = new Date(new Date(stream.scheduledAt).getTime() + stream.duration * 60 * 1000);
            return now <= endTime; // Only show if not expired
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
            ...activeLiveStreams.map(liveStream => ({
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