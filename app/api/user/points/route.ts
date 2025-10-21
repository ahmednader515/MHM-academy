import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        fullName: true
      }
    });

    // Check if points column exists by trying to select it
    let points = 0;
    try {
      const userWithPoints = await db.user.findUnique({
        where: { id: userId },
        select: {
          points: true
        }
      });
      points = userWithPoints?.points || 0;
    } catch (error) {
      // Points column doesn't exist yet, return 0
      console.log("Points column doesn't exist yet, returning 0");
      points = 0;
    }

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json({
      ...user,
      points
    });
  } catch (error) {
    console.error("[USER_POINTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
