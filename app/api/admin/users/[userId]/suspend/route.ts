import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { isSuspended } = await req.json();

        if (typeof isSuspended !== "boolean") {
            return new NextResponse("isSuspended must be a boolean", { status: 400 });
        }

        // Check if user exists
        const existingUser = await db.user.findUnique({
            where: {
                id: resolvedParams.userId
            }
        });

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Prevent suspending admins or supervisors
        if (existingUser.role === "ADMIN" || existingUser.role === "SUPERVISOR") {
            return new NextResponse("Cannot suspend admin or supervisor accounts", { status: 400 });
        }

        // Update user suspension status
        const updatedUser = await db.user.update({
            where: {
                id: resolvedParams.userId
            },
            data: {
                isSuspended
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[ADMIN_USER_SUSPEND]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

