import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden - Admin access required", { status: 403 });
    }

    const { fullName, phoneNumber, email, college, faculty, password, confirmPassword } = await req.json();

    if (!fullName || !phoneNumber || !email || !password || !confirmPassword) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    if (password !== confirmPassword) {
      return new NextResponse("Passwords do not match", { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new NextResponse("Invalid email format", { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { email }
        ]
      },
    });

    if (existingUser) {
      if (existingUser.phoneNumber === phoneNumber) {
        return new NextResponse("Phone number already exists", { status: 400 });
      }
      if (existingUser.email === email) {
        return new NextResponse("Email already exists", { status: 400 });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with USER role (student)
    const newUser = await db.user.create({
      data: {
        fullName,
        phoneNumber,
        email,
        college: college || null,
        faculty: faculty || null,
        hashedPassword,
        role: "USER", // Always create as student
      },
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error("[ADMIN_CREATE_ACCOUNT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 