"use client";

import { QuizResultDetail } from "@/app/dashboard/_components/quiz-result-detail";

const AdminQuizResultDetailPage = ({ params }: { params: Promise<{ resultId: string }> }) => {
    return <QuizResultDetail role="admin" params={params} />;
};

export default AdminQuizResultDetailPage;
