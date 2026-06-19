import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CURRICULA = ["egyptian", "saudi", "summer_courses", "center_mhm_academy"] as const;
const CURRICULUM_TYPES = ["morning", "evening"] as const;
const LEVELS = ["kg", "primary", "preparatory", "secondary", "summer_levels"] as const;

function validateProfileData(data: {
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    parentPhoneNumber?: string;
    curriculum?: string;
    curriculumType?: string | null;
    level?: string;
    language?: string | null;
    grade?: string;
}) {
    const { fullName, phoneNumber, email, parentPhoneNumber, curriculum, curriculumType, level, grade } = data;

    if (!fullName?.trim() || !phoneNumber?.trim() || !email?.trim() || !parentPhoneNumber?.trim()) {
        return "Missing required fields";
    }

    if (!EMAIL_REGEX.test(email)) {
        return "Invalid email format";
    }

    if (phoneNumber === parentPhoneNumber) {
        return "Parent phone number cannot be the same as student phone number";
    }

    if (!curriculum || !CURRICULA.includes(curriculum as (typeof CURRICULA)[number])) {
        return "Invalid curriculum";
    }

    if (curriculum === "egyptian") {
        if (!curriculumType || !CURRICULUM_TYPES.includes(curriculumType as (typeof CURRICULUM_TYPES)[number])) {
            return "Curriculum type is required for Egyptian curriculum";
        }
    }

    if (!level || !LEVELS.includes(level as (typeof LEVELS)[number])) {
        return "Invalid level";
    }

    if (!grade?.trim()) {
        return "Grade is required";
    }

    return null;
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "USER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
                fullName: true,
                phoneNumber: true,
                email: true,
                parentPhoneNumber: true,
                curriculum: true,
                curriculumType: true,
                level: true,
                language: true,
                grade: true,
            },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("[USER_PROFILE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "USER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await req.json();
        const {
            fullName,
            phoneNumber,
            email,
            parentPhoneNumber,
            curriculum,
            curriculumType,
            level,
            language,
            grade,
        } = body;

        const validationError = validateProfileData({
            fullName,
            phoneNumber,
            email,
            parentPhoneNumber,
            curriculum,
            curriculumType,
            level,
            language,
            grade,
        });

        if (validationError) {
            return new NextResponse(validationError, { status: 400 });
        }

        const existingUser = await db.user.findUnique({
            where: { id: session.user.id },
        });

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        if (phoneNumber !== existingUser.phoneNumber) {
            const phoneExists = await db.user.findFirst({
                where: {
                    phoneNumber,
                    id: { not: session.user.id },
                },
            });
            if (phoneExists) {
                return new NextResponse("Phone number already exists", { status: 400 });
            }
        }

        if (email !== existingUser.email) {
            const emailExists = await db.user.findFirst({
                where: {
                    email,
                    id: { not: session.user.id },
                },
            });
            if (emailExists) {
                return new NextResponse("Email already exists", { status: 400 });
            }
        }

        const parentAsStudent = await db.user.findFirst({
            where: {
                phoneNumber: parentPhoneNumber,
                role: "USER",
                id: { not: session.user.id },
            },
        });

        if (parentAsStudent) {
            return new NextResponse("Parent phone number is already registered as a student", { status: 400 });
        }

        const updatedUser = await db.$transaction(async (tx) => {
            const existingParent = await tx.user.findFirst({
                where: {
                    phoneNumber: parentPhoneNumber,
                    role: "PARENT",
                },
            });

            if (!existingParent && parentPhoneNumber !== existingUser.parentPhoneNumber) {
                await tx.user.create({
                    data: {
                        fullName: `${fullName.split(" ")[0]}'s Parent`,
                        phoneNumber: parentPhoneNumber,
                        email: `parent_${parentPhoneNumber.replace("+", "")}@mhm.academy`,
                        hashedPassword: existingUser.hashedPassword ?? "",
                        role: "PARENT",
                    },
                });
            }

            return tx.user.update({
                where: { id: session.user.id },
                data: {
                    fullName: fullName.trim(),
                    phoneNumber: phoneNumber.trim(),
                    email: email.trim(),
                    parentPhoneNumber: parentPhoneNumber.trim(),
                    curriculum,
                    curriculumType: curriculum === "egyptian" ? curriculumType : null,
                    level,
                    language: language || null,
                    grade,
                },
                select: {
                    fullName: true,
                    phoneNumber: true,
                    email: true,
                    parentPhoneNumber: true,
                    curriculum: true,
                    curriculumType: true,
                    level: true,
                    language: true,
                    grade: true,
                },
            });
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[USER_PROFILE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
