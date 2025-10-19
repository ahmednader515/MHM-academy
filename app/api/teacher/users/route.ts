import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        console.log("[TEACHER_USERS_GET] Starting request");
        
        const session = await getServerSession(authOptions);
        console.log("[TEACHER_USERS_GET] Session:", { 
            userId: session?.user?.id, 
            role: session?.user?.role,
            hasSession: !!session,
            hasUser: !!session?.user
        });

        if (!session?.user) {
            console.log("[TEACHER_USERS_GET] No session or user");
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            console.log("[TEACHER_USERS_GET] Access denied:", { userId: session.user.id, role: session.user.role });
            return new NextResponse("Forbidden", { status: 403 });
        }

        console.log("[TEACHER_USERS_GET] User is teacher, fetching users from database");
        
        // Teachers can see all users (USER, TEACHER, and ADMIN roles)
        const users = await db.user.findMany({
            where: {
                role: {
                    in: ["USER", "TEACHER", "ADMIN"]
                }
            },
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
            }
        });

        console.log("[TEACHER_USERS_GET] Found users:", users.length);
        console.log("[TEACHER_USERS_GET] Users by role:", {
            USER: users.filter(u => u.role === "USER").length,
            TEACHER: users.filter(u => u.role === "TEACHER").length,
            ADMIN: users.filter(u => u.role === "ADMIN").length
        });
        
        return NextResponse.json(users);
    } catch (error) {
        console.error("[TEACHER_USERS_GET] Error details:", error);
        console.error("[TEACHER_USERS_GET] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
        return new NextResponse(`Internal Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
    }
}
