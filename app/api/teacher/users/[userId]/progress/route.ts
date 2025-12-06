import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id || !session?.user) {
            console.error("[TEACHER_USER_PROGRESS_GET] Unauthorized - missing userId or user");
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const currentUserId = session.user.id;
        const user = session.user;

        console.log("[TEACHER_USER_PROGRESS_GET] Auth check:", {
            hasUserId: !!currentUserId,
            hasUser: !!user,
            userRole: user?.role,
            targetUserId: resolvedParams.userId
        });

        // Allow teachers and admins
        if (user.role !== "TEACHER" && user.role !== "ADMIN") {
            console.error("[TEACHER_USER_PROGRESS_GET] Access denied - user role:", user.role, "Expected: TEACHER or ADMIN");
            return new NextResponse("Forbidden - Only teachers and admins can access this", { status: 403 });
        }

        const targetUser = await db.user.findUnique({
            where: {
                id: resolvedParams.userId
            }
        });

        if (!targetUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Get teacher's course IDs for filtering
        let teacherCourseIds: string[] = [];
        if (user.role === "TEACHER") {
            const teacherOwnedCourses = await db.course.findMany({
                where: {
                    userId: currentUserId
                },
                select: {
                    id: true
                }
            });

            teacherCourseIds = teacherOwnedCourses.map(c => c.id);
            
            // Allow teachers to view any student, even if they don't have courses yet
            // They just won't see any progress data
        }

        // Get all purchases for the student
        const allPurchases = await db.purchase.findMany({
            where: {
                userId: resolvedParams.userId
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        userId: true,
                        isFree: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // Filter purchases to only teacher's courses if user is a teacher
        const purchases = user.role === "TEACHER" 
            ? allPurchases.filter(p => teacherCourseIds.includes(p.course.id))
            : allPurchases;

        // Get user progress, filtered by teacher's courses if teacher
        const allUserProgress = await db.userProgress.findMany({
            where: user.role === "TEACHER" 
                ? {
                    userId: resolvedParams.userId,
                    chapter: {
                        courseId: {
                            in: teacherCourseIds.length > 0 ? teacherCourseIds : []
                        }
                    }
                }
                : {
                    userId: resolvedParams.userId
                },
            include: {
                chapter: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        });

        // For teachers, get all chapters from their courses (so they can see all potential chapters)
        // For admins, get all chapters from purchased courses
        let courseIdsForChapters: string[] = [];
        if (user.role === "TEACHER") {
            // Show all chapters from teacher's courses
            courseIdsForChapters = teacherCourseIds;
        } else {
            // For admins, show chapters from purchased courses
            courseIdsForChapters = purchases.map(purchase => purchase.course.id);
        }

        // Get all chapters from relevant courses
        const allChapters = courseIdsForChapters.length > 0 
            ? await db.chapter.findMany({
                where: {
                    courseId: {
                        in: courseIdsForChapters
                    },
                    isPublished: true
                },
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                },
                orderBy: [
                    {
                        course: {
                            title: "asc"
                        }
                    },
                    {
                        position: "asc"
                    }
                ]
            })
            : [];

        // Use filtered progress
        const userProgress = allUserProgress;

        console.log("[TEACHER_USER_PROGRESS_GET] Response data:", {
            userProgressCount: userProgress.length,
            purchasesCount: purchases.length,
            allChaptersCount: allChapters.length,
            teacherCourseIds: teacherCourseIds.length,
            courseIdsForChapters: courseIdsForChapters.length
        });

        return NextResponse.json({
            userProgress,
            purchases,
            allChapters
        });
    } catch (error) {
        console.error("[TEACHER_USER_PROGRESS_GET]", error);
        console.error("[TEACHER_USER_PROGRESS_GET] Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined
        });
        return new NextResponse("Internal Error", { status: 500 });
    }
}

