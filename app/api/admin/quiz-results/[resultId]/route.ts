import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getQuizResultDetail, gradeWrittenQuizAnswer } from "@/lib/quiz-grading";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ resultId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
            return new NextResponse("Forbidden - Only admins and supervisors can access this resource", { status: 403 });
        }

        const quizResult = await getQuizResultDetail({
            id: resolvedParams.resultId
        });

        if (!quizResult) {
            return new NextResponse("Quiz result not found", { status: 404 });
        }

        return NextResponse.json(quizResult);
    } catch (error) {
        console.log("[ADMIN_QUIZ_RESULT_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ resultId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id || !session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
            return new NextResponse("Forbidden - Only admins and supervisors can grade this resource", { status: 403 });
        }

        const { answerId, isCorrect } = await req.json();

        if (!answerId || typeof isCorrect !== "boolean") {
            return new NextResponse("answerId and isCorrect are required", { status: 400 });
        }

        const graded = await gradeWrittenQuizAnswer({
            resultId: resolvedParams.resultId,
            answerId,
            isCorrect,
            accessWhere: {}
        });

        if (graded.error === "not_found") {
            return new NextResponse("Quiz result not found", { status: 404 });
        }

        if (graded.error === "answer_not_found") {
            return new NextResponse("Answer not found", { status: 404 });
        }

        if (graded.error === "not_written") {
            return new NextResponse("Only written answers can be graded manually", { status: 400 });
        }

        return NextResponse.json(graded.result);
    } catch (error) {
        console.log("[ADMIN_QUIZ_RESULT_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
