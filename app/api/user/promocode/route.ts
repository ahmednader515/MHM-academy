import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get student's promocode
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user;

    // Only for students
    if (user.role !== "USER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get the student's promocode (only approved ones with codes)
    const promocode = await db.promoCode.findFirst({
      where: {
        studentId: userId,
        status: 'approved',
        code: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Check if there's a pending request
    const pendingRequest = await db.promoCode.findFirst({
      where: {
        studentId: userId,
        status: 'requested'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ 
      promocode: promocode || null,
      hasPendingRequest: !!pendingRequest
    });
  } catch (error) {
    console.error("[PROMOCODE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Request a promocode
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user;

    // Only for students
    if (user.role !== "USER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Check if student already has a pending request or active promocode
    const existingPromocode = await db.promoCode.findFirst({
      where: {
        studentId: userId,
        status: {
          in: ['requested', 'approved']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (existingPromocode) {
      if (existingPromocode.status === 'requested') {
        return new NextResponse(
          JSON.stringify({ message: "You already have a pending promocode request" }),
          { status: 400 }
        );
      }
      if (existingPromocode.status === 'approved' && !existingPromocode.isUsed) {
        return new NextResponse(
          JSON.stringify({ message: "You already have an active promocode" }),
          { status: 400 }
        );
      }
    }

    // Create a promocode request
    await db.promoCode.create({
      data: {
        studentId: userId,
        status: 'requested',
      }
    });

    return NextResponse.json({ success: true, message: "Promocode request submitted" });
  } catch (error) {
    console.error("[PROMOCODE_REQUEST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

