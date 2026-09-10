"use client";

import { QuizResultDetail } from "@/app/dashboard/_components/quiz-result-detail";

const QuizResultDetailPage = ({ params }: { params: Promise<{ resultId: string }> }) => {
    return <QuizResultDetail role="teacher" params={params} />;
};

export default QuizResultDetailPage;
