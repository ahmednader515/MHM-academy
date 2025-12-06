import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Combine both queries into one to reduce operations
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        fullName: true,
        points: true
      },
      cacheStrategy: { ttl: 60 } // Cache user points for 60 seconds
    });
    
    const points = user?.points || 0;

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
