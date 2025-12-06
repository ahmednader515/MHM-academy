import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user?.role !== "TEACHER") {
            return NextResponse.json({ error: "Forbidden - Only teachers can access this resource" }, { status: 403 });
        }

        // Teachers can only see their own courses
        const courses = await db.course.findMany({
            where: {
                userId: userId
            },
            select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                price: true,
                isPublished: true,
                isFree: true,
                createdAt: true,
                updatedAt: true,
                chapters: {
                    select: {
                        id: true,
                        title: true,
                        isPublished: true,
                        position: true
                    },
                    orderBy: {
                        position: 'asc'
                    }
                },
                quizzes: {
                    select: {
                        id: true,
                        title: true,
                        isPublished: true,
                        position: true
                    },
                    orderBy: {
                        position: 'asc'
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
        });

        return NextResponse.json(courses);
    } catch (error) {
        console.log("[TEACHER_COURSES_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
