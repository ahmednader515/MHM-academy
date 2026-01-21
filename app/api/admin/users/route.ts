import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const users = await db.user.findMany({
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
                curriculum: true,
                level: true,
                language: true,
                grade: true,
                role: true,
                balance: true,
                points: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        courses: true,
                        purchases: true,
                        userProgress: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("[ADMIN_USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 