import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only for students
        if (session.user.role !== "USER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const userId = session.user.id;
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                curriculum: true,
                curriculumType: true,
                level: true,
                language: true,
                grade: true,
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // First, deactivate messages older than 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        await db.studentMessage.updateMany({
            where: {
                isActive: true,
                createdAt: {
                    lt: twentyFourHoursAgo
                }
            },
            data: {
                isActive: false
            }
        });

        // Find active messages that match the student's classification
        // A message matches if:
        // 1. It has no target filters (applies to all students)
        // 2. All specified filters in the message match the student's classification
        //    (null filters in message mean "any", so they match any student value)
        const allMessages = await db.studentMessage.findMany({
            where: {
                isActive: true,
            },
            orderBy: {
                createdAt: "desc"
            },
        });

        // Filter messages that match the student
        const matchingMessages = allMessages.filter(message => {
            // If message has no filters, it applies to all students
            if (!message.targetCurriculum && !message.targetLevel && !message.targetLanguage && !message.targetGrade) {
                return true;
            }

            // Check if all specified filters match the student's classification
            // For curriculum: message target must match student's curriculum (or be null in message)
            // If student has curriculumType "morning" or "evening", they should have curriculum "egyptian"
            let studentCurriculum = user.curriculum;
            // If curriculum is null but curriculumType is set, assume it's egyptian
            if (!studentCurriculum && user.curriculumType) {
                studentCurriculum = 'egyptian';
            }
            const curriculumMatch = !message.targetCurriculum || 
                (message.targetCurriculum === studentCurriculum);

            // For level: message target must match student's level (or be null in message)
            const levelMatch = !message.targetLevel || 
                (message.targetLevel === user.level);

            // For language: message target must match student's language (or be null in message)
            // If message has no language filter, it matches any student language (including null)
            // Handle both null and empty string as "no filter"
            const messageLanguage = message.targetLanguage || null;
            const studentLanguage = user.language || null;
            const languageMatch = !messageLanguage || (messageLanguage === studentLanguage);

            // For grade: message target must match student's grade (or be null in message)
            const messageGrade = message.targetGrade || null;
            const studentGrade = user.grade || null;
            const gradeMatch = !messageGrade || (messageGrade === studentGrade);

            const matches = curriculumMatch && levelMatch && languageMatch && gradeMatch;

            // Debug logging
            console.log('[MESSAGE_MATCH]', {
                messageId: message.id,
                messageText: message.message.substring(0, 50) + '...',
                messageFilters: {
                    curriculum: message.targetCurriculum,
                    level: message.targetLevel,
                    language: message.targetLanguage,
                    grade: message.targetGrade,
                },
                studentFilters: {
                    curriculum: user.curriculum,
                    curriculumType: user.curriculumType,
                    level: user.level,
                    language: user.language,
                    grade: user.grade,
                },
                resolvedCurriculum: studentCurriculum,
                matches: {
                    curriculum: curriculumMatch,
                    level: levelMatch,
                    language: languageMatch,
                    grade: gradeMatch,
                },
                finalMatch: matches
            });

            return matches;
        });

        // Limit to 5 most recent
        const messages = matchingMessages.slice(0, 5);

        return NextResponse.json(messages);
    } catch (error) {
        console.error("[DASHBOARD_MESSAGES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

