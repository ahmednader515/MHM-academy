import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get certificates for all children of the current parent
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Get the current user to verify they are a parent
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, phoneNumber: true },
    });

    if (!currentUser || currentUser.role !== "PARENT") {
      return new NextResponse("Access denied. Parent role required.", { status: 403 });
    }

    // Find all children linked to this parent's phone number
    const children = await db.user.findMany({
      where: {
        parentPhoneNumber: currentUser.phoneNumber,
        role: "USER",
      },
      select: {
        id: true,
      },
    });

    const childrenIds = children.map(child => child.id);

    // Get all certificates for all children
    const certificates = await db.certificate.findMany({
      where: {
        studentId: {
          in: childrenIds,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
          },
        },
        assigner: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(certificates);
  } catch (error) {
    console.error("[PARENT_CERTIFICATES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

