import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get all teachers with their courses, quizzes, and live streams (admin only)
export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        // Check if user is admin or supervisor
        if (user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
            return new NextResponse("Forbidden - Only admins and supervisors can access this", { status: 403 });
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
            },
        });

        const teacherIds = teachers.map(t => t.id);

        // Batch all queries to avoid N+1 problem
        const [allCourses, allQuizzes, allLiveStreams] = await Promise.all([
            db.course.findMany({
                where: {
                    userId: {
                        in: teacherIds
                    }
                },
                select: {
                    id: true,
                    userId: true,
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
                },
            }),
            db.quiz.findMany({
                where: {
                    course: {
                        userId: {
                            in: teacherIds
                        }
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
                            title: true,
                            userId: true
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
                },
            }),
            db.liveStream.findMany({
                where: {
                    course: {
                        userId: {
                            in: teacherIds
                        }
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
                            title: true,
                            userId: true
                        }
                    },
                    createdAt: true
                },
                orderBy: {
                    createdAt: "desc"
                },
            })
        ]);

        // Group content by teacher ID
        const coursesByTeacher = new Map<string, typeof allCourses>();
        const quizzesByTeacher = new Map<string, typeof allQuizzes>();
        const liveStreamsByTeacher = new Map<string, typeof allLiveStreams>();

        allCourses.forEach(course => {
            if (!coursesByTeacher.has(course.userId)) {
                coursesByTeacher.set(course.userId, []);
            }
            coursesByTeacher.get(course.userId)!.push(course);
        });

        allQuizzes.forEach(quiz => {
            const teacherId = quiz.course.userId;
            if (!quizzesByTeacher.has(teacherId)) {
                quizzesByTeacher.set(teacherId, []);
            }
            quizzesByTeacher.get(teacherId)!.push(quiz);
        });

        allLiveStreams.forEach(stream => {
            const teacherId = stream.course.userId;
            if (!liveStreamsByTeacher.has(teacherId)) {
                liveStreamsByTeacher.set(teacherId, []);
            }
            liveStreamsByTeacher.get(teacherId)!.push(stream);
        });

        // Map teachers with their content
        const teachersWithContent = teachers.map((teacher) => {
            const courses = coursesByTeacher.get(teacher.id) || [];
            const quizzes = quizzesByTeacher.get(teacher.id) || [];
            const liveStreams = liveStreamsByTeacher.get(teacher.id) || [];

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
        });

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

