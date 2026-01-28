import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Create a new certificate (teacher/admin only)
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user;

    // Check if user is teacher, admin, or supervisor
    if (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { studentId, imageUrl, title, description } = await req.json();

    if (!studentId || !imageUrl) {
      return new NextResponse("Student ID and image URL are required", { status: 400 });
    }

    // Verify student exists
    const student = await db.user.findUnique({
      where: {
        id: studentId,
      },
    });

    if (!student || student.role !== "USER") {
      return new NextResponse("Student not found", { status: 404 });
    }

    // Create certificate
    const certificate = await db.certificate.create({
      data: {
        studentId,
        assignedBy: userId,
        imageUrl,
        title: title || null,
        description: description || null,
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        assigner: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json(certificate);
  } catch (error) {
    console.error("[CERTIFICATE_CREATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// GET - Get all certificates (teacher/admin view)
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user;

    // Check if user is teacher, admin, or supervisor
    if (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Filter by assigner if teacher (only see their own certificates)
    // Admin and supervisor can see all certificates
    const whereClause = user.role === "TEACHER" 
      ? { assignedBy: userId }
      : {};

    const certificates = await db.certificate.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
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
    console.error("[CERTIFICATES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

