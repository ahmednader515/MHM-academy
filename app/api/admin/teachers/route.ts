import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get all teachers with their courses, quizzes, and live streams (admin only)
export async function GET(req: Request) {
    try {
        const { userId, user } = await auth();

        if (!userId || !user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if user is admin
        if (user.role !== "ADMIN") {
            return new NextResponse("Forbidden - Only admins can access this", { status: 403 });
        }

        // Get all teachers
        const teachers = await db.user.findMany({
            where: {
                role: "TEACHER"
            },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
                createdAt: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // For each teacher, get their courses, quizzes, and live streams
        const teachersWithContent = await Promise.all(
            teachers.map(async (teacher) => {
                const courses = await db.course.findMany({
                    where: {
                        userId: teacher.id
                    },
                    select: {
                        id: true,
                        title: true,
                        isPublished: true,
                        price: true,
                        createdAt: true,
                        _count: {
                            select: {
                                chapters: true,
                                quizzes: true,
                                liveStreams: true,
                                purchases: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                });

                const quizzes = await db.quiz.findMany({
                    where: {
                        course: {
                            userId: teacher.id
                        }
                    },
                    select: {
                        id: true,
                        title: true,
                        isPublished: true,
                        position: true,
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        },
                        _count: {
                            select: {
                                questions: true,
                                quizResults: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                });

                const liveStreams = await db.liveStream.findMany({
                    where: {
                        course: {
                            userId: teacher.id
                        }
                    },
                    select: {
                        id: true,
                        title: true,
                        isPublished: true,
                        scheduledAt: true,
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        },
                        createdAt: true
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                });

                return {
                    ...teacher,
                    courses,
                    quizzes,
                    liveStreams,
                    totalCourses: courses.length,
                    totalQuizzes: quizzes.length,
                    totalLiveStreams: liveStreams.length,
                    publishedCourses: courses.filter(c => c.isPublished).length,
                    publishedQuizzes: quizzes.filter(q => q.isPublished).length,
                    publishedLiveStreams: liveStreams.filter(l => l.isPublished).length
                };
            })
        );

        return NextResponse.json(teachersWithContent);
    } catch (error) {
        console.error("[ADMIN_TEACHERS_GET]", error);
        console.error("[ADMIN_TEACHERS_GET] Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined
        });
        return new NextResponse("Internal Error", { status: 500 });
    }
}

