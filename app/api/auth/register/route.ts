import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { fullName, phoneNumber, email, parentPhoneNumber, curriculum, level, language, grade, password, confirmPassword } = await req.json();

    if (!fullName || !phoneNumber || !email || !parentPhoneNumber || !password || !confirmPassword) {
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

    // Check if parent phone number already exists as a student
    const existingParentAsStudent = await db.user.findFirst({
      where: {
        phoneNumber: parentPhoneNumber,
        role: "USER"
      }
    });

    if (existingParentAsStudent) {
      return new NextResponse("Parent phone number is already registered as a student", { status: 400 });
    }

    // Hash password (no complexity requirements)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user and parent account in a transaction
    await db.$transaction(async (tx) => {
      // Create the student account
      const student = await tx.user.create({
        data: {
          fullName,
          phoneNumber,
          email,
          curriculum: curriculum || null,
          level: level || null,
          language: language || null,
          grade: grade || null,
          hashedPassword,
          parentPhoneNumber,
          role: "USER",
        },
      });

      // Check if parent account already exists
      const existingParent = await tx.user.findFirst({
        where: {
          phoneNumber: parentPhoneNumber,
          role: "PARENT"
        }
      });

      // Create parent account if it doesn't exist
      if (!existingParent) {
        await tx.user.create({
          data: {
            fullName: `${fullName.split(' ')[0]}'s Parent`, // Use first name + 's Parent
            phoneNumber: parentPhoneNumber,
            email: `parent_${parentPhoneNumber.replace('+', '')}@mhm.academy`, // Generate email
            hashedPassword: hashedPassword, // Use the same password as the student
            role: "PARENT",
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REGISTER]", error);
    
    // If the table doesn't exist or there's a database connection issue,
    // return a specific error message
    if (error instanceof Error && (
      error.message.includes("does not exist") || 
      error.message.includes("P2021") ||
      error.message.includes("table")
    )) {
      return new NextResponse("Database not initialized. Please run database migrations.", { status: 503 });
    }
    
    return new NextResponse("Internal Error", { status: 500 });
  }
} 