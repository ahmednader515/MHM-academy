import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Add 10 points to the user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: 10,
        },
      },
      select: {
        id: true,
        points: true,
        role: true,
        fullName: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[USER_POINTS_ADD]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
