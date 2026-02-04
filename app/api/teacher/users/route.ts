import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";


export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;
        const user = session.user;

        // Check if user is teacher, admin, or supervisor
        if (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
            return new NextResponse("Forbidden", { status: 403 });
        }


        console.log("[TEACHER_USERS_GET] User is teacher, fetching users from database");
        
        // For teachers, only show students enrolled in their published courses
        // For admins/supervisors, show all users
        let users;
        
        if (user.role === "TEACHER") {
            // Get teacher's published course IDs
            const teacherCourses = await db.course.findMany({
                where: {
                    userId: userId,
                    isPublished: true
                },
                select: {
                    id: true
                }
            });
            
            const teacherCourseIds = teacherCourses.map((c: { id: string }) => c.id);
            
            if (teacherCourseIds.length === 0) {
                // Teacher has no published courses, return empty array
                return NextResponse.json([]);
            }
            
            // Get students who have active purchases for teacher's courses
            const purchases = await db.purchase.findMany({
                where: {
                    courseId: {
                        in: teacherCourseIds
                    },
                    status: "ACTIVE",
                    user: {
                        role: "USER"
                    }
                },
                select: {
                    userId: true
                },
                distinct: ['userId']
            });
            
            const studentIds = purchases.map((p: { userId: string }) => p.userId);
            
            if (studentIds.length === 0) {
                // No students enrolled, return empty array
                return NextResponse.json([]);
            }
            
            // Get the student users
            users = await db.user.findMany({
                where: {
                    id: {
                        in: studentIds
                    },
                    role: "USER"
                },
                select: {
                    id: true,
                    fullName: true,
                    phoneNumber: true,
                    email: true,
                    curriculum: true,
                    curriculumType: true,
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
        } else {
            // Admins and supervisors can see all users
            users = await db.user.findMany({
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
                    curriculumType: true,
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
        }

        console.log("[TEACHER_USERS_GET] Found users:", users.length);
        console.log("[TEACHER_USERS_GET] Users by role:", {
            USER: users.filter((u: any) => u.role === "USER").length,
            TEACHER: users.filter((u: any) => u.role === "TEACHER").length,
            ADMIN: users.filter((u: any) => u.role === "ADMIN").length
        });
        
        return NextResponse.json(users);
    } catch (error) {
        console.error("[TEACHER_USERS_GET] Error details:", error);
        console.error("[TEACHER_USERS_GET] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
        return new NextResponse(`Internal Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
    }
}
