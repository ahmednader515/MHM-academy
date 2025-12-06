import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // Check if user is teacher
    const session = await auth();
    
    if (!session?.user?.id || !session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user;

    if (user.role !== "TEACHER") {
      return new NextResponse("Forbidden - Teacher access required", { status: 403 });
    }

    const { fullName, phoneNumber, email, parentPhoneNumber, curriculum, level, language, grade, password, confirmPassword } = await req.json();

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

    // Normalize and validate parentPhoneNumber
    // Convert to string and trim - handle all falsy values
    const parentPhoneStr = parentPhoneNumber ? String(parentPhoneNumber).trim() : '';
    let finalParentPhoneNumber: string | null = null;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user and parent account in a transaction (if parent phone number is provided)
    const newUser = await db.$transaction(async (tx) => {
      // If parent phone number is provided, ensure parent exists
      if (parentPhoneStr.length > 0) {
        // Check if parent phone number is the same as student phone number
        if (parentPhoneStr === phoneNumber.trim()) {
          throw new Error("Parent phone number cannot be the same as student phone number");
        }

        // Check if parent account already exists
        const existingParent = await tx.user.findFirst({
          where: {
            phoneNumber: parentPhoneStr,
            role: "PARENT"
          }
        });

        // Create parent account if it doesn't exist (MUST be created first)
        if (!existingParent) {
          // Check if this phone number is already used by a student
          const existingStudentWithParentPhone = await tx.user.findFirst({
            where: {
              phoneNumber: parentPhoneStr,
              role: "USER"
            }
          });

          if (existingStudentWithParentPhone) {
            throw new Error("This phone number is already registered as a student. Parent phone numbers must be different from student phone numbers.");
          }

          // Create parent account
          await tx.user.create({
            data: {
              fullName: `${fullName.split(' ')[0]}'s Parent`, // Use first name + 's Parent
              phoneNumber: parentPhoneStr,
              email: `parent_${parentPhoneStr.replace(/\+/g, '').replace(/\s/g, '')}@mhm.academy`, // Generate email
              hashedPassword: hashedPassword, // Use the same password as the student
              role: "PARENT",
            },
          });
        }

        finalParentPhoneNumber = parentPhoneStr;
      }

      // Create the student account
      return await tx.user.create({
        data: {
          fullName,
          phoneNumber,
          email,
          parentPhoneNumber: finalParentPhoneNumber,
          curriculum: curriculum || null,
          level: level || null,
          language: language || null,
          grade: grade || null,
          hashedPassword,
          role: "USER", // Always create as student
        },
      });
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
  } catch (error: any) {
    console.error("[TEACHER_CREATE_ACCOUNT]", error);
    console.error("[TEACHER_CREATE_ACCOUNT] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      code: error?.code,
      meta: error?.meta
    });

    // Handle Prisma foreign key constraint errors specifically
    if (error?.code === 'P2003') {
      const constraintName = error?.meta?.field_name || 'unknown';
      if (constraintName.includes('parentPhoneNumber')) {
        return new NextResponse("Parent phone number does not exist in the system. Please ensure the parent account is created first.", { status: 400 });
      }
    }

    return new NextResponse(
      error instanceof Error ? error.message : "Internal Error",
      { status: 500 }
    );
  }
} 