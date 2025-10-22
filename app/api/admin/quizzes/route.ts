import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden - Only admins can access this resource" }, { status: 403 });
        }

        // Admins can see all quizzes from all teachers
        const quizzes = await db.quiz.findMany({
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                role: true,
                            }
                        }
                    }
                },
                questions: {
                    select: {
                        id: true,
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            cacheStrategy: { ttl: 300 }, // Cache for 5 minutes
        });

        return NextResponse.json(quizzes);
    } catch (error) {
        console.log("[ADMIN_QUIZZES_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}