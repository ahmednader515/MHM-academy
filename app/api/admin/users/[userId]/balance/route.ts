import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const resolvedParams = await params;
        const { newBalance } = await req.json();

        if (typeof newBalance !== "number" || newBalance < 0) {
            return new NextResponse("Invalid balance amount", { status: 400 });
        }

        const user = await db.user.findUnique({
            where: {
                id: resolvedParams.userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        await db.user.update({
            where: {
                id: resolvedParams.userId
            },
            data: {
                balance: newBalance
            }
        });

        return NextResponse.json({ message: "Balance updated successfully" });
    } catch (error) {
        console.error("[ADMIN_USER_BALANCE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 