import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        if (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
            return NextResponse.json({ error: "Forbidden - Only teachers, admins, and supervisors can access this resource" }, { status: 403 });
        }

        // Teachers can only see their own courses, but admins and supervisors can see all courses
        const whereClause = (user.role === "ADMIN" || user.role === "SUPERVISOR")
            ? {}
            : { userId: userId };

        const courses = await db.course.findMany({
            where: whereClause,
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
