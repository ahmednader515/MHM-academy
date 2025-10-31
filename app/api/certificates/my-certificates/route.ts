import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get certificates for the current user (student)
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const certificates = await db.certificate.findMany({
      where: {
        studentId: userId,
      },
      include: {
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
    console.error("[MY_CERTIFICATES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

