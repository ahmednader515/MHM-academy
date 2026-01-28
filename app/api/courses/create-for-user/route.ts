import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = session.user;

        // Only admin or supervisor can create courses for other users
        if (user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { userId, title } = await req.json();

        if (!userId) {
            return new NextResponse("User ID is required", { status: 400 });
        }

        // Verify the target user exists and is a teacher, admin, or supervisor
        const targetUser = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true }
        });

        if (!targetUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        if (targetUser.role !== "TEACHER" && targetUser.role !== "ADMIN" && targetUser.role !== "SUPERVISOR") {
            return new NextResponse("Can only create courses for teachers, admins, or supervisors", { status: 400 });
        }

        // Create the course for the selected user
        const course = await db.course.create({
            data: {
                userId: userId,
                title: title || "مادة غير معرفة",
            },
        });

        return NextResponse.json(course);
    } catch (error) {
        console.error("[CREATE_COURSE_FOR_USER]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

