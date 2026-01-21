import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

// GET - Get all students with points (for promocode management)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = session.user;

    // Only for admin, supervisor, and teacher
    if (user.role !== "ADMIN" && user.role !== "SUPERVISOR" && user.role !== "TEACHER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get all students with their points and promocode status
    const students = await db.user.findMany({
      where: {
        role: "USER",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        points: true,
        requestedPromoCodes: {
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            code: true,
            status: true,
            discountPercentage: true,
            isUsed: true,
            createdAt: true,
            requestedAt: true,
          }
        },
      },
      orderBy: {
        points: 'desc'
      }
    });

    // Format the response
    const studentsWithPromoStatus = students.map(student => {
      // Find the most recent approved promocode that's not used
      const approvedPromocode = student.requestedPromoCodes.find(p => 
        p.status === 'approved' && p.code && !p.isUsed
      );
      
      // Find the most recent pending request
      const pendingRequest = student.requestedPromoCodes.find(p => p.status === 'requested');
      
      return {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        phoneNumber: student.phoneNumber,
        points: student.points || 0,
        hasPromocode: !!approvedPromocode,
        hasPendingRequest: !!pendingRequest,
        promocode: approvedPromocode || null,
        pendingRequest: pendingRequest || null,
      };
    });

    return NextResponse.json(studentsWithPromoStatus);
  } catch (error) {
    console.error("[ADMIN_PROMOCODES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Create a promocode for a student
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = session.user;

    // Only for admin, supervisor, and teacher
    if (user.role !== "ADMIN" && user.role !== "SUPERVISOR" && user.role !== "TEACHER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { studentId, discountPercentage } = await req.json();

    if (!studentId || !discountPercentage) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    if (discountPercentage < 1 || discountPercentage > 100) {
      return new NextResponse("Discount percentage must be between 1 and 100", { status: 400 });
    }

    // Verify student exists
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true }
    });

    if (!student || student.role !== "USER") {
      return new NextResponse("Student not found", { status: 404 });
    }

    // Generate unique promocode
    let code: string;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      // Generate a random 8-character code
      code = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      const existing = await db.promoCode.findUnique({
        where: { code }
      });
      
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return new NextResponse("Failed to generate unique code", { status: 500 });
    }

    // Check if there's a pending request for this student
    const pendingRequest = await db.promoCode.findFirst({
      where: {
        studentId,
        status: 'requested'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    let promocode;
    
    if (pendingRequest) {
      // Update the existing request with the code and approve it
      promocode = await db.promoCode.update({
        where: {
          id: pendingRequest.id
        },
        data: {
          code: code!,
          createdBy: user.id,
          discountPercentage,
          status: 'approved',
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
            }
          }
        }
      });
    } else {
      // Create new promocode directly (approved)
      promocode = await db.promoCode.create({
        data: {
          code: code!,
          studentId,
          createdBy: user.id,
          discountPercentage,
          status: 'approved',
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
            }
          }
        }
      });
    }

    return NextResponse.json(promocode);
  } catch (error) {
    console.error("[ADMIN_PROMOCODES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

