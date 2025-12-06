import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get all courses for admin
        const courses = await db.course.findMany({
            where: {
                isPublished: true
            },
            select: {
                id: true,
                title: true,
                isPublished: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(courses);
    } catch (error) {
        console.error("[ADMIN_COURSES_ALL_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

